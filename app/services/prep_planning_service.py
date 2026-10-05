"""Date-aware net prep demand, including committed production and FEFO output."""
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from app.db.models.inventory_orm import Inventory
from app.db.models.inventory_lot_orm import InventoryLot
from app.repositories.batch_recipes_repo import BatchRecipeRepository
from app.repositories.batch_recipe_ingredients_repo import BatchRecipeIngredientRepository
from app.repositories.inventory_lot_repo import InventoryLotRepository
from app.repositories.prep_schedule_repo import PrepScheduleRepository
from app.repositories.ingredients_repo import IngredientRepository
from app.services.inventory_stats_service import InventoryStatsService
from app.services.utils.unit_conversion import convert_unit


class PrepPlanningService:
    def __init__(self, db, restaurant_id):
        self.batches = BatchRecipeRepository(db, restaurant_id)
        self.components = BatchRecipeIngredientRepository(db, restaurant_id)
        self.lots = InventoryLotRepository(db, restaurant_id)
        self.preps = PrepScheduleRepository(db, restaurant_id)
        self.ingredients = IngredientRepository(db, restaurant_id)
        self.stats = InventoryStatsService(db, restaurant_id)

    async def build(self, gross_batches, direct_ingredients):
        balances, graph, definitions = {}, {}, {}
        raw = defaultdict(Decimal)
        plan = defaultdict(lambda: {
            'gross_quantity': Decimal('0'), 'usable_stock': Decimal('0'),
            'net_quantity': Decimal('0'), 'scheduled_quantity': Decimal('0'),
            'additional_quantity': Decimal('0'), 'committed_output': Decimal('0')})
        days = [row['forecast_date'] for row in gross_batches + direct_ingredients]
        all_preps = await self.preps.get_all()
        incomplete = [{'prep_id': prep.prep_id, 'batch_recipe_id': prep.batch_recipe_id, 'prep_date': prep.prep_date,
                       'message': 'Overdue prep is excluded from available output; complete or reschedule it.'}
                      for prep in all_preps if days and prep.prep_date < min(days)
                      and getattr(prep.status, 'value', prep.status) in {'scheduled', 'in_progress'}]
        pending = [prep for prep in all_preps
                   if days and min(days) <= prep.prep_date <= max(days)
                   and getattr(prep.status, 'value', prep.status) in {'scheduled', 'in_progress'}]

        async def definition(batch_id):
            if batch_id not in definitions:
                batch = await self.batches.get_by_id(batch_id)
                output = Decimal(str(batch.yield_quantity or 0)) if batch else Decimal('0')
                if not output.is_finite() or output <= 0:
                    raise ValueError(f'Invalid batch yield for {batch_id}')
                components = await self.components.get_by_batch_recipe_id(batch_id)
                definitions[batch_id] = (batch, components)
                graph[str(batch_id)] = {
                    'yield_quantity': output, 'yield_unit': batch.yield_unit,
                    'shelf_life_days': batch.shelf_life_days,
                    'components': [{'kind': getattr(comp.ingredient_type, 'value', comp.ingredient_type),
                        'reference_id': comp.reference_id, 'quantity': comp.quantity_used,
                        'unit': comp.unit} for comp in components]}
            return definitions[batch_id]

        async def stock_balance(batch_id, batch):
            if batch_id in balances:
                return balances[batch_id]
            stock = []
            for lot in await self.lots.get_all_by_batch_recipe_id(batch_id):
                if getattr(lot.status, 'value', lot.status) != 'available':
                    continue
                stock.append({'identity': (0, lot.lot_id), 'delivery': lot.delivery_date,
                    'expiry': lot.spoilage_expected_date, 'scheduled': False,
                    'quantity': convert_unit(await self.stats.get_lot_remaining(lot), lot.unit, batch.yield_unit)})
            inventories = (await self.stats.db.execute(select(Inventory).where(
                Inventory.restaurant_id == self.stats.restaurant_id,
                Inventory.inventory_id.in_(select(InventoryLot.inventory_id).where(
                    InventoryLot.restaurant_id == self.stats.restaurant_id,
                    InventoryLot.batch_recipe_id == batch_id))))).scalars().all()
            summary = sum((convert_unit(Decimal(str(inv.quantity_on_hand or 0)), inv.unit, batch.yield_unit)
                           for inv in inventories), Decimal('0'))
            if sum((row['quantity'] for row in stock), Decimal('0')) != summary:
                raise ValueError(f'Prepared batch {batch_id} lot balances require reconciliation')
            for prep in pending:
                if prep.batch_recipe_id != batch_id:
                    continue
                count = Decimal(str(prep.prep_batch_count or 0))
                if not count.is_finite() or count <= 0:
                    raise ValueError(f'Pending prep {prep.prep_id} requires a positive batch count')
                output = count * Decimal(str(batch.yield_quantity))
                stock.append({'identity': (1, prep.prep_id), 'delivery': prep.prep_date,
                    'expiry': prep.prep_date + timedelta(days=batch.shelf_life_days) if batch.shelf_life_days else None,
                    'scheduled': True, 'quantity': output})
                plan[(prep.prep_date, batch_id)]['committed_output'] += output
            balances[batch_id] = sorted(stock, key=lambda row: (row['expiry'] or date.max, row['identity']))
            return balances[batch_id]

        async def inputs(batch_id, output, day, path):
            batch, components = await definition(batch_id)
            for component in components:
                kind = getattr(component.ingredient_type, 'value', component.ingredient_type)
                amount = Decimal(str(component.quantity_used))
                if not amount.is_finite() or amount < 0:
                    raise ValueError(f'Invalid batch input quantity for {batch_id}')
                required = amount * output / Decimal(str(batch.yield_quantity))
                if kind == 'batch':
                    await require(component.reference_id, required, component.unit, day, path | {batch_id})
                elif kind == 'ingredient':
                    ingredient = await self.ingredients.get_by_id(component.reference_id)
                    if not ingredient:
                        raise ValueError(f'Missing raw ingredient {component.reference_id}')
                    raw[(day, ingredient.ingredient_id, ingredient.unit)] += convert_unit(required, component.unit, ingredient.unit)
                else:
                    raise ValueError(f'Unsupported batch input {kind}')

        async def require(batch_id, quantity, unit, day, path):
            if batch_id in path:
                raise ValueError(f'Batch cycle in material plan: {batch_id}')
            batch, _ = await definition(batch_id)
            quantity = convert_unit(quantity, unit, batch.yield_unit)
            if not quantity.is_finite() or quantity < 0:
                raise ValueError('Prepared demand must be finite and nonnegative')
            physical, scheduled = Decimal('0'), Decimal('0')
            for lot in await stock_balance(batch_id, batch):
                if lot['delivery'] > day or (lot['expiry'] and lot['expiry'] < day):
                    continue
                take = min(quantity - physical - scheduled, lot['quantity'])
                if lot['scheduled']:
                    scheduled += take
                else:
                    physical += take
                lot['quantity'] -= take
            additional = quantity - physical - scheduled
            entry = plan[(day, batch_id)]
            entry['gross_quantity'] += quantity
            entry['usable_stock'] += physical
            entry['net_quantity'] += quantity - physical
            entry['scheduled_quantity'] += scheduled
            entry['additional_quantity'] += additional
            if additional > 0:
                await inputs(batch_id, additional, day, path)

        # Evaluate commitments and customer demand in date order so a later
        # production task cannot reserve stock needed by an earlier service day.
        events = [(prep.prep_date, 0, prep.prep_id, prep) for prep in pending]
        events += [(row['forecast_date'], 1, row['batch_recipe_id'], row) for row in gross_batches]
        for day, kind, _, item in sorted(events, key=lambda event: event[:3]):
            if kind == 0:
                batch, _ = await definition(item.batch_recipe_id)
                await stock_balance(item.batch_recipe_id, batch)
                await inputs(item.batch_recipe_id,
                             Decimal(str(item.prep_batch_count)) * Decimal(str(batch.yield_quantity)), day, set())
            else:
                await require(item['batch_recipe_id'], Decimal(str(item['required_quantity'])),
                              item['unit'], day, set())

        ingredients = list(direct_ingredients)
        ingredients.extend({'forecast_date': day, 'ingredient_id': item_id, 'quantity': quantity,
                            'unit': unit, 'source_type': 'net_prep', 'source_id': 0}
                           for (day, item_id, unit), quantity in sorted(raw.items()))
        production_order, visited = [], set()
        def visit(batch_id, path):
            if batch_id in path:
                raise ValueError('Batch graph cycle in production order')
            if batch_id in visited:
                return
            for component in graph.get(str(batch_id), {}).get('components', []):
                if component['kind'] == 'batch':
                    visit(component['reference_id'], path | {batch_id})
            visited.add(batch_id)
            production_order.append(batch_id)
        for batch_id in sorted(int(key) for key in graph):
            visit(batch_id, set())
        rank = {batch_id: index for index, batch_id in enumerate(production_order)}
        recommendations = []
        for (day, batch_id), entry in plan.items():
            batch, _ = await definition(batch_id)
            entry['unit'], entry['yield_quantity'] = batch.yield_unit, Decimal(str(batch.yield_quantity))
            remaining = sum((lot['quantity'] for lot in balances.get(batch_id, [])
                             if lot['scheduled'] and lot['delivery'] == day), Decimal('0'))
            recommendations.append({'forecast_date': day, 'batch_recipe_id': batch_id, **entry,
                'additional_batch_count': entry['additional_quantity'] / entry['yield_quantity'],
                'unallocated_scheduled_output': remaining,
                'review_required': remaining > 0})
        recommendations.sort(key=lambda row: (row['forecast_date'], rank.get(row['batch_recipe_id'], 0)))
        return {'batches': recommendations, 'ingredients': ingredients, 'recipe_graph': graph,
                'production_order': production_order, 'batch_count_policy': 'fractional_actual_yield',
                'incomplete_preps': incomplete,
                'review_required': bool(incomplete) or any(row['review_required'] for row in recommendations)}
