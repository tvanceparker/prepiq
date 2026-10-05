"""Real persistence regression cases for material quantities and retry behavior."""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
import pytest_asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
import app.db.models
from app.db.session import Base
from app.db.models.inventory_orm import Inventory
from app.db.models.inventory_lot_orm import InventoryLot
from app.db.models.inventory_usage_log_orm import InventoryUsageLog
from app.db.models.ingredients_orm import Ingredient
from app.db.models.batch_recipes_orm import BatchRecipe
from app.db.models.batch_recipe_ingredients_orm import BatchRecipeIngredient
from app.db.models.prep_schedule_orm import PrepSchedule
from app.db.models.purchase_orders_orm import PurchaseOrder
from app.db.models.purchase_order_items_orm import PurchaseOrderItem
from app.services.utils.inventory_consumption import InventoryConsumption
from app.services.inventory_stats_service import InventoryStatsService
from app.services.prep_service import PrepService
from app.services.prep_planning_service import PrepPlanningService
from app.services.reorder_forecast_engine import ReorderForecastEngine
from app.services.reorder.pack_contract import pack_order
from app.services.utils.forecast_snapshot import encode, restore
from app.repositories.inventory_usage_log_repo import InventoryUsageLogRepository
from app.repositories.purchase_order_items_repo import PurchaseOrderItemRepository
from app.utils.eod_runner import due_business_dates
from app.utils.replenishment_policy import resolve_cadence

DAY = date(2026, 10, 5)
D = Decimal


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine('sqlite+aiosqlite:///:memory:')
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        session.add(Ingredient(ingredient_id=1, restaurant_id=1, name='Tomato', unit='kg',
                               abc_class='A', policy_type='fresh_perishable', service_level_z=D('1.28')))
        await session.commit()
        yield session
    await engine.dispose()


async def stock(db, *, quantity=10, kind='ingredient', item_id=1, lots=None, tenant=1):
    inventory = Inventory(restaurant_id=tenant, ingredient_id=item_id if kind == 'ingredient' else None,
                          quantity_on_hand=quantity, unit='kg')
    db.add(inventory)
    await db.flush()
    for lot_quantity, expiry in lots or [(quantity, DAY + timedelta(days=5))]:
        db.add(InventoryLot(restaurant_id=tenant, inventory_id=inventory.inventory_id,
            ingredient_id=item_id if kind == 'ingredient' else None,
            batch_recipe_id=item_id if kind == 'batch' else None,
            quantity=lot_quantity, total_received=lot_quantity, unit='kg',
            delivery_date=DAY, spoilage_expected_date=expiry, status='available'))
    await db.flush()
    return inventory


@pytest.mark.asyncio
async def test_fefo_sales_retry_and_tenant_isolation(db):
    inventory = await stock(db, lots=[(6, DAY + timedelta(days=5)), (4, DAY)])
    other = await stock(db, quantity=90, tenant=2)
    consumer = InventoryConsumption(db, 1)
    first = await consumer.consume(item_kind='ingredient', item_id=1, quantity=D('5000'), unit='g',
        reference_type='eod_sales', reference_id=20261005, business_date=DAY)
    assert [row['quantity_deducted'] for row in first] == [4000, 1000]
    await db.commit()
    assert await consumer.consume(item_kind='ingredient', item_id=1, quantity=D('5'), unit='kg',
        reference_type='eod_sales', reference_id=20261005, business_date=DAY) == []
    assert float(inventory.quantity_on_hand) == 5
    assert float(other.quantity_on_hand) == 90
    stats = InventoryStatsService(db, 1)
    result = await stats.get_usable_inventory(1)
    assert result['quantity'] == D('5')
    assert result['reconciliation_required'] is False


@pytest.mark.asyncio
async def test_daily_usage_sums_timestamps_converts_units_excludes_waste_and_pads_zero(db):
    inventory = await stock(db)
    for hour, quantity, unit, usage_type in [(1, 500, 'g', 'sale'), (20, 1, 'kg', 'sale'),
                                            (22, 7, 'kg', 'waste')]:
        db.add(InventoryUsageLog(restaurant_id=1, inventory_id=inventory.inventory_id,
            ingredient_id=1, used_quantity=quantity, unit=unit, usage_type=usage_type,
            used_date=datetime.combine(DAY, datetime.min.time()) + timedelta(hours=hour)))
    await db.commit()
    assert await InventoryUsageLogRepository(db, 1).get_daily_usage(1, 3, DAY) == [(DAY, D('1.5'))]
    stats = InventoryStatsService(db, 1)
    stats.as_of_date = DAY
    stats._get_sales_derived_usage = AsyncMock(return_value={})
    assert await stats.get_average_daily_usage(1, 3) == D('0.50')
    assert await stats.get_std_dev_usage(1, 3) == D('0.707107')


@pytest.mark.asyncio
async def test_batch_production_consumes_child_stock_atomically_and_only_once(db):
    await stock(db, quantity=10)
    child = await stock(db, kind='batch', item_id=2, quantity=4)
    db.add_all([BatchRecipe(batch_recipe_id=2, restaurant_id=1, name='Chopped tomato',
                           yield_quantity=4, yield_unit='kg', shelf_life_days=2),
                BatchRecipe(batch_recipe_id=3, restaurant_id=1, name='Salsa',
                           yield_quantity=5, yield_unit='kg', shelf_life_days=2),
                BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=3, reference_id=1,
                                      ingredient_type='ingredient', quantity_used=500, unit='g'),
                BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=3, reference_id=2,
                                      ingredient_type='batch', quantity_used=2, unit='kg'),
                PrepSchedule(prep_id=1, restaurant_id=1, batch_recipe_id=3, prep_date=DAY,
                             prep_batch_count=2, status='scheduled')])
    await db.commit()
    service = PrepService(db, 1, 'full', 1)
    result = await service.update_prep_schedule(1, 'completed')
    assert result['quantity_prepped'] == D('10')
    await db.commit()
    repeat = await service.update_prep_schedule(1, 'completed')
    assert repeat['quantity_prepped'] == D('10')
    assert float(child.quantity_on_hand) == 0
    assert await db.scalar(select(func.count()).select_from(InventoryLot).where(InventoryLot.prep_id == 1)) == 1
    inputs = (await db.execute(select(InventoryUsageLog).where(InventoryUsageLog.reference_type == 'prep'))).unique().scalars().all()
    assert sum(log.used_quantity for log in inputs if log.ingredient_id == 1) == D('1')
    assert all(log.lot_id is not None and log.lot.prep_id is None for log in inputs)
    with pytest.raises(ValueError, match='explicit correction'):
        await service.update_prep_schedule(1, 'completed', prep_batch_count=3)


@pytest.mark.asyncio
async def test_failed_production_leaves_no_output_or_partial_inputs(db):
    raw = await stock(db, quantity=1)
    db.add_all([BatchRecipe(batch_recipe_id=3, restaurant_id=1, name='Salsa', yield_quantity=5, yield_unit='kg'),
                BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=3, reference_id=1,
                    ingredient_type='ingredient', quantity_used=2, unit='kg'),
                PrepSchedule(prep_id=1, restaurant_id=1, batch_recipe_id=3, prep_date=DAY,
                    prep_batch_count=1, status='scheduled')])
    await db.commit()
    with pytest.raises(ValueError, match='Insufficient usable'):
        await PrepService(db, 1, 'full', 1).update_prep_schedule(1, 'completed')
    assert await db.scalar(select(func.count()).select_from(InventoryLot).where(InventoryLot.prep_id == 1)) == 0
    assert float(raw.quantity_on_hand) == 1


@pytest.mark.asyncio
async def test_prepared_stock_nets_purchasing_and_pending_prep_suggestions(db):
    db.add_all([BatchRecipe(batch_recipe_id=2, restaurant_id=1, name='Salsa', yield_quantity=2, yield_unit='kg'),
                BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=2, reference_id=1,
                    ingredient_type='ingredient', quantity_used=1, unit='kg'),
                PrepSchedule(restaurant_id=1, batch_recipe_id=2, prep_date=DAY, prep_batch_count=1, status='scheduled')])
    await stock(db, kind='batch', item_id=2, quantity=4)
    plan = await PrepPlanningService(db, 1).build([
        {'batch_recipe_id': 2, 'forecast_date': DAY, 'required_quantity': D('10'), 'unit': 'kg'}], [])
    assert plan['batches'][0]['net_quantity'] == D('6')
    assert plan['batches'][0]['additional_quantity'] == D('4')
    assert sum(row['quantity'] for row in plan['ingredients']) == D('3')


@pytest.mark.asyncio
async def test_confirmed_inbound_is_tenant_scoped_and_net_of_receipts(db):
    db.add_all([PurchaseOrder(order_id=1, restaurant_id=1, status='pending', order_date=DAY,
                             expected_delivery_date=DAY + timedelta(days=2)),
                PurchaseOrder(order_id=2, restaurant_id=1, status='cart', order_date=DAY),
                PurchaseOrder(order_id=3, restaurant_id=2, status='pending', order_date=DAY)])
    for order_id, tenant, amount, received in [(1, 1, 20, 5), (2, 1, 80, 0), (3, 2, 90, 0)]:
        db.add(PurchaseOrderItem(order_id=order_id, restaurant_id=tenant, ingredient_id=1,
                                quantity_ordered=amount, quantity_received=received, unit='kg'))
    await db.flush()
    inbound = await PurchaseOrderItemRepository(db, 1).get_confirmed_inbound(1)
    assert [row['quantity'] for row in inbound] == [D('15')]


@pytest.mark.asyncio
async def test_delivery_window_starts_at_arrival_and_merges_same_day_events(db):
    engine = ReorderForecastEngine(db, 1)
    engine.stats_service.get_current_inventory = AsyncMock(return_value=(D('0'), 'kg'))
    engine.stats_service.get_usable_inventory = AsyncMock(return_value={'quantity': D('0'), 'unit': 'kg'})
    engine.calculate_max_order = AsyncMock(return_value=D('100'))
    supplier = SimpleNamespace(unit='kg', lead_time_days=2, review_period_days=3, order_schedule_type='ad_hoc',
                               min_order_quantity=0, spoilage_rate=0)
    decision = await engine.build_reorder_decision(ingredient_id=1, unit='g', lead_time=2,
        daily_forecast=[(DAY + timedelta(days=2), D('4000')), (DAY + timedelta(days=2), D('6000')),
                        (DAY + timedelta(days=3), D('10000'))], supplier=supplier, as_of_date=DAY,
        shelf_life_days=2, moq=D('0'), manage_alerts=False)
    assert decision['final_quantity'] == D('22')
    assert decision['should_reorder'] is True
    assert decision['shelf_demand'] == D('20')


def test_pack_caps_compare_physical_stock_units_and_require_review():
    result = pack_order({'final_quantity': D('15000'), 'effective_constraint_cap': D('15000')},
        stock_unit='g', supplier_unit='kg', pack_size=5, quantity_per_pack_item=2, minimum_quantity=0)
    assert result['quantity'] == D('20')
    assert result['quantity_in_stock_unit'] == D('20000')
    assert result['review_required'] is True


def test_snapshot_roundtrip_preserves_fractional_quantities_and_business_dates():
    snapshot = {'version': 1, 'menus': {2: {'daily_breakdown': [(DAY, D('1.235'))]}},
                'aggregated': {1: {'unit': 'kg', 'daily_breakdown': [(DAY, D('0.123'))]}},
                'batches': [], 'ingredients': []}
    assert restore(encode(snapshot)) == snapshot


def test_every_n_days_anchor_does_not_slide_each_evaluation():
    kwargs = {'lead_time_days': 2, 'review_period_days': 3, 'order_schedule_type': 'every_n_days',
              'order_schedule_anchor_date': DAY}
    assert resolve_cadence(as_of_date=DAY + timedelta(days=1), **kwargs).next_order_date == DAY + timedelta(days=3)
    assert resolve_cadence(as_of_date=DAY + timedelta(days=2), **kwargs).next_order_date == DAY + timedelta(days=3)


def test_eod_delay_crossing_midnight_and_overnight_use_opening_business_date():
    restaurant = SimpleNamespace(timezone='America/Boise', last_eod_run_date=DAY - timedelta(days=1),
        eod_run_after_close_mins=60, hours_of_operation=[{'day': 'Monday', 'open': '17:00', 'close': '23:30'}])
    assert due_business_dates(restaurant, datetime(2026, 10, 6, 6, 40, tzinfo=timezone.utc)) == [DAY]
    restaurant.hours_of_operation[0]['close'] = '02:00'
    assert due_business_dates(restaurant, datetime(2026, 10, 6, 9, 10, tzinfo=timezone.utc)) == [DAY]

@pytest.mark.asyncio
async def test_manual_waste_uses_fefo_canonical_units_and_durable_retry(db):
    inventory = await stock(db, lots=[(6, DAY + timedelta(days=4)), (4, DAY)])
    prep = PrepService(db, 1, 'full', 1)
    first = await prep.create_waste_log(ingredient_id=1, quantity_wasted=D('1500'), unit='g',
        reason='damaged', request_key='delivery-damage-1')
    await db.commit()
    again = await prep.create_waste_log(ingredient_id=1, quantity_wasted=D('1500'), unit='g',
        reason='damaged', request_key='delivery-damage-1')
    assert again == first
    assert inventory.quantity_on_hand == D('8.5')
    logs = (await db.execute(select(InventoryUsageLog))).unique().scalars().all()
    assert len(logs) == 1 and logs[0].lot_id == first['movements'][0]['lot_id']
    assert logs[0].used_quantity == D('1.5')
    with pytest.raises(ValueError, match='different values'):
        await prep.create_waste_log(ingredient_id=1, quantity_wasted=D('1'), unit='g',
                                   request_key='delivery-damage-1')


@pytest.mark.asyncio
async def test_prepared_expiry_after_partial_consumption_is_atomic_and_repeatable(db):
    from app.services.eod_service import EODService
    inventory = await stock(db, kind='batch', item_id=20, quantity=5, lots=[(5, DAY)])
    await InventoryConsumption(db, 1).consume(item_kind='batch', item_id=20, quantity=D('2'), unit='kg',
        reference_type='eod_sales', reference_id=20261005, business_date=DAY)
    await db.commit()
    eod = EODService(db, 1, 'full')
    await eod.auto_deduct_spoilage(DAY)
    await db.commit()
    await eod.auto_deduct_spoilage(DAY)
    logs = (await db.execute(select(InventoryUsageLog).where(InventoryUsageLog.usage_type == 'spoilage'))).unique().scalars().all()
    assert len(logs) == 1 and logs[0].ingredient_id is None and logs[0].used_quantity == D('3')
    assert inventory.quantity_on_hand == 0


@pytest.mark.asyncio
async def test_small_quantities_survive_conversion_and_persistence(db):
    inventory = await stock(db, quantity=1)
    await InventoryConsumption(db, 1).consume(item_kind='ingredient', item_id=1, quantity=D('1'), unit='g',
        reference_type='sale', reference_id=5, business_date=DAY)
    await db.commit()
    await db.refresh(inventory)
    assert inventory.quantity_on_hand == D('0.999')
    stats = InventoryStatsService(db, 1)
    assert (await stats.get_usable_inventory(1))['quantity'] == D('0.999')


@pytest.mark.asyncio
async def test_complete_persisted_eod_cart_receipt_prep_sale_expiry_workflow(db):
    """Only model fitting is deterministic; business stages use their real repositories."""
    from app.services.eod_service import EODService
    from app.services.inventory_service import InventoryService
    from app.db.models.restaurants_orm import Restaurant
    from app.db.models.menu_items_orm import MenuItem
    from app.db.models.recipes_orm import Recipe
    from app.db.models.recipe_ingredients_orm import RecipeIngredient
    from app.db.models.menu_item_recipes_orm import MenuItemRecipe
    from app.db.models.sales_orm import Sales
    from app.db.models.supplier_orm import Supplier
    from app.db.models.ingredient_supplier_orm import IngredientSupplier
    from app.db.models.eod_run_ledger_orm import EODRunLedger
    from app.db.models.forecast_run_ledger_orm import ForecastRunLedger
    from app.db.models.forecast_breakdown_orm import ForecastBreakdown
    db.add_all([
        Restaurant(restaurant_id=1, name='Golden Kitchen', subscription_tier='full', timezone='UTC', settings={'sales_history_coverage': {'start_date': DAY.isoformat(), 'end_date': DAY.isoformat()}}),
        MenuItem(menu_item_id=1, restaurant_id=1, name='Salsa bowl', price=8),
        Recipe(recipe_id=1, restaurant_id=1, name='Bowl recipe'),
        MenuItemRecipe(restaurant_id=1, menu_item_id=1, recipe_id=1),
        BatchRecipe(batch_recipe_id=20, restaurant_id=1, name='Salsa', yield_quantity=5, yield_unit='kg', shelf_life_days=5),
        BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=20, reference_id=1,
                              ingredient_type='ingredient', quantity_used=2500, unit='g'),
        RecipeIngredient(restaurant_id=1, recipe_id=1, reference_id=20, ingredient_type='batch', quantity_used=250, unit='g'),
        Sales(sale_id=1, restaurant_id=1, menu_item_id=1, quantity_sold=4, business_date=DAY, sale_timestamp=datetime.combine(DAY, datetime.min.time())),
        Supplier(supplier_id=1, restaurant_id=1, name='Fresh supplier'),
        IngredientSupplier(ingredient_supplier_id=1, restaurant_id=1, supplier_id=1, ingredient_id=1,
            cost_per_unit=2, lead_time_days=0, review_period_days=4, order_schedule_type='ad_hoc',
            shelf_life_days=5, unit='kg', pack_size=1, quantity_per_pack_item=D('0.1'), min_order_quantity=0, preferred=True),
    ])
    raw = await stock(db, quantity=0)
    prepared = await stock(db, kind='batch', item_id=20, quantity=5)
    other = await stock(db, quantity=100, tenant=2)
    await db.commit()
    eod = EODService(db, 1, 'full')
    eod.forecasting_engine.initialize = AsyncMock()
    eod.forecasting_engine.should_retrain_model = AsyncMock(return_value=True)
    eod.forecasting_engine.train_menu_item_model = AsyncMock(return_value=(None, {}))
    eod.forecasting_engine.select_forecast_strategy = AsyncMock(return_value={'model_type_used': 'weekday_baseline', 'model_source': 'golden'})
    eod.forecasting_engine.generate_forecast_with_metadata = AsyncMock(return_value=(
        [{'forecast_date': DAY + timedelta(days=i), 'predicted_quantity': D('8')} for i in range(1, 5)],
        {'model_type_used': 'weekday_baseline', 'model_source': 'golden'}))
    result = await eod.finalize_end_of_day_summary(DAY, forecast_horizon_days=4, reorder_horizon_days=4)
    assert result['purchase_orders_created'] == 1
    assert prepared.quantity_on_hand == 4 and other.quantity_on_hand == 100
    ledger = (await db.execute(select(EODRunLedger))).scalar_one()
    forecast_run = (await db.execute(select(ForecastRunLedger))).scalar_one()
    assert ledger.finalized and forecast_run.finalized
    snapshot = restore(forecast_run.result_snapshot)
    assert snapshot['aggregated'][1]['total_quantity'] == D('2')
    assert len((await db.execute(select(ForecastBreakdown))).scalars().all()) == 4
    await EODService(db, 1, 'full').finalize_end_of_day_summary(DAY, forecast_horizon_days=4, reorder_horizon_days=4)
    assert prepared.quantity_on_hand == 4
    order = (await db.execute(select(PurchaseOrder).where(PurchaseOrder.restaurant_id == 1))).scalar_one()
    item = (await db.execute(select(PurchaseOrderItem).where(PurchaseOrderItem.order_id == order.order_id))).scalar_one()
    assert order.order_date == DAY + timedelta(days=1)
    assert item.quantity_ordered > 0 and item.pack_count * item.pack_quantity == item.quantity_ordered
    order.status = 'pending'
    await db.commit()
    inventory_service = InventoryService(db, 1, 'full', 1)
    await inventory_service.receive_purchase_order(order.order_id, actual_delivery_date=DAY + timedelta(days=1))
    await db.commit()
    received = item.quantity_ordered
    await db.refresh(raw)
    assert raw.quantity_on_hand == received  # no second pack multiplication
    db.add(PrepSchedule(prep_id=40, restaurant_id=1, batch_recipe_id=20, prep_date=DAY + timedelta(days=3),
                        prep_batch_count=D('0.8'), status='scheduled'))
    await db.commit()
    await PrepService(db, 1, 'full', 1).finalize_batch_recipe_production(40)
    await db.commit()
    assert raw.quantity_on_hand == received - 2
    assert prepared.quantity_on_hand == 8
    await InventoryConsumption(db, 1).consume(item_kind='batch', item_id=20, quantity=D('8'), unit='kg',
        reference_type='eod_sales', reference_id=20261009, business_date=DAY + timedelta(days=4))
    await db.commit()
    await eod.auto_deduct_spoilage(DAY + timedelta(days=10))
    await db.commit()
    await eod.auto_deduct_spoilage(DAY + timedelta(days=10))
    assert raw.quantity_on_hand == 0 and prepared.quantity_on_hand == 0 and other.quantity_on_hand == 100


def test_shadow_benchmark_conserves_food_and_cannot_see_future():
    from dataclasses import replace
    from app.services.reorder.benchmark import Scenario, simulate
    scenario = Scenario('prefix', tuple([2.] * 28 + [8.] * 28), 2, 2, 3, 1)
    for algorithm in ['legacy', 'corrected', 'corrected_stable', 'corrected_recipe', 'corrected_intermittent', 'periodic', 'seasonal_periodic', 'candidate']:
        result = simulate(scenario, algorithm)
        changed = simulate(replace(scenario, actual_demand=tuple([2.] * 28 + [40.] * 28)), algorithm)
        assert result['decisions'][:15] == changed['decisions'][:15]
        fulfilled = sum(scenario.actual_demand) - result['stockout_quantity']
        assert result['ordered_quantity'] == pytest.approx(fulfilled + result['waste_quantity'] + result['ending_stock'] + result['inbound_remaining'], abs=1e-3)
        assert 0 <= result['fill_rate'] <= 1

@pytest.mark.asyncio
async def test_partial_reference_retry_keeps_successes_and_fills_only_missing_item(db):
    from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper
    db.add(Ingredient(ingredient_id=2, restaurant_id=1, name='Rice', unit='kg'))
    await stock(db, item_id=1, quantity=3)
    missing = await stock(db, item_id=2, quantity=0)
    await db.commit()
    helper = InventoryDeductionHelper(db, 1, 'full', None)
    usage = [{'ingredient_id': 1, 'quantity': D('2'), 'unit': 'kg'},
             {'ingredient_id': 2, 'quantity': D('1'), 'unit': 'kg'}]
    result = await helper.deduct_usage_summary(usage, 'eod_sales', 20261005)
    await db.commit()
    assert len(result['failures']) == 1 and len(result['deducted_items']) == 1
    missing.quantity_on_hand = 1
    db.add(InventoryLot(restaurant_id=1, inventory_id=missing.inventory_id, ingredient_id=2,
        quantity=1, total_received=1, unit='kg', delivery_date=DAY, status='available'))
    await db.commit()
    retried = await helper.deduct_usage_summary(usage, 'eod_sales', 20261005)
    await db.commit()
    assert not retried['failures'] and len(retried['deducted_items']) == 1
    logs = (await db.execute(select(InventoryUsageLog))).unique().scalars().all()
    assert sorted(log.used_quantity for log in logs) == [D('1'), D('2')]
    assert await helper.discrepancy_repo.get_open() == []


@pytest.mark.asyncio
async def test_eod_reconciliation_subtracts_real_time_movements_for_same_business_day(db):
    inventory = await stock(db)
    consumer = InventoryConsumption(db, 1)
    await consumer.consume(item_kind='ingredient', item_id=1, quantity=D('2'), unit='kg',
        reference_type='order', reference_id=10, business_date=DAY)
    await db.commit()
    result = await consumer.consume(item_kind='ingredient', item_id=1, quantity=D('3'), unit='kg',
        reference_type='eod_sales', reference_id=20261005, business_date=DAY)
    assert result[0]['quantity_deducted'] == 1
    await db.commit()
    assert inventory.quantity_on_hand == 7
    assert await consumer.consume(item_kind='ingredient', item_id=1, quantity=D('3'), unit='kg',
        reference_type='eod_sales', reference_id=20261005, business_date=DAY) == []


@pytest.mark.asyncio
async def test_accuracy_excludes_future_outcomes_missing_imports_and_late_issued_forecasts(db):
    from app.services.forecasting_engine import ForecastingEngine
    from app.db.models.forecasts_orm import Forecast
    from app.db.models.forecast_breakdown_orm import ForecastBreakdown
    from app.db.models.sales_orm import Sales
    from app.db.models.restaurants_orm import Restaurant
    restaurant = Restaurant(restaurant_id=1, name='Accuracy kitchen', subscription_tier='full',
        settings={'sales_history_coverage': {'start_date': DAY.isoformat(), 'end_date': (DAY + timedelta(days=1)).isoformat()}})
    forecast = Forecast(forecast_id=1, restaurant_id=1, menu_item_id=1, forecast_period_start=DAY,
        forecast_period_end=DAY + timedelta(days=1), created_at=datetime.combine(DAY - timedelta(days=1), datetime.min.time()))
    db.add_all([restaurant, forecast,
        ForecastBreakdown(forecast_id=1, restaurant_id=1, menu_item_id=1, forecast_date=DAY, forecasted_quantity=D('2.5')),
        ForecastBreakdown(forecast_id=1, restaurant_id=1, menu_item_id=1, forecast_date=DAY + timedelta(days=1), forecasted_quantity=999),
        Sales(sale_id=1, restaurant_id=1, menu_item_id=1, quantity_sold=2, business_date=DAY, sale_timestamp=datetime.combine(DAY, datetime.min.time())),
        Sales(sale_id=2, restaurant_id=1, menu_item_id=1, quantity_sold=50, business_date=DAY + timedelta(days=1), sale_timestamp=datetime.combine(DAY + timedelta(days=1), datetime.min.time()))])
    await db.commit()
    engine = ForecastingEngine(db, 1, 'full')
    engine.forecast_origin = DAY
    metrics = await engine._compute_forecast_accuracy_metrics(1)
    assert metrics['mae'] == .5 and metrics['bias'] == .5 and metrics['mape'] == .25
    restaurant.settings = {**restaurant.settings, 'sales_observations': {DAY.isoformat(): 'missing'}}
    await db.commit()
    assert await engine._compute_forecast_accuracy_metrics(1) == {}
    restaurant.settings = {'sales_history_coverage': {'start_date': DAY.isoformat(), 'end_date': DAY.isoformat()}}
    forecast.created_at = datetime.combine(DAY, datetime.min.time())
    await db.commit()
    assert await engine._compute_forecast_accuracy_metrics(1) == {}


def test_observation_contract_distinguishes_missing_closed_and_censored_days():
    from app.services.utils.demand_observations import DemandObservations
    observations = DemandObservations({'sales_history_coverage': {'start_date': DAY.isoformat(), 'end_date': (DAY + timedelta(days=4)).isoformat()},
        'sales_observations': {(DAY + timedelta(days=1)).isoformat(): 'closed',
                               (DAY + timedelta(days=2)).isoformat(): 'missing',
                               (DAY + timedelta(days=3)).isoformat(): 'stockout',
                               (DAY + timedelta(days=4)).isoformat(): 'unavailable'}})
    assert observations.status(DAY) == 'complete'
    assert observations.status(DAY - timedelta(days=1)) == 'unknown'
    quality = observations.quality(DAY, DAY + timedelta(days=4))
    assert quality['review_required'] and quality['day_status_counts'] == {'complete': 1, 'closed': 1, 'missing': 1, 'stockout': 1, 'unavailable': 1}


@pytest.mark.asyncio
async def test_pending_output_carries_to_later_demand_until_its_expiry(db):
    db.add_all([BatchRecipe(batch_recipe_id=2, restaurant_id=1, name='Salsa',
                    yield_quantity=2, yield_unit='kg', shelf_life_days=1),
                BatchRecipeIngredient(restaurant_id=1, batch_recipe_id=2, reference_id=1,
                    ingredient_type='ingredient', quantity_used=1, unit='kg'),
                PrepSchedule(restaurant_id=1, batch_recipe_id=2, prep_date=DAY,
                    prep_batch_count=2, status='scheduled')])
    await db.commit()
    plan = await PrepPlanningService(db, 1).build([
        {'batch_recipe_id': 2, 'forecast_date': DAY, 'required_quantity': D('1'), 'unit': 'kg'},
        {'batch_recipe_id': 2, 'forecast_date': DAY + timedelta(days=1), 'required_quantity': D('3'), 'unit': 'kg'},
        {'batch_recipe_id': 2, 'forecast_date': DAY + timedelta(days=2), 'required_quantity': D('2'), 'unit': 'kg'}], [])
    assert [row['additional_quantity'] for row in plan['batches']] == [D('0'), D('0'), D('2')]
    assert [row['scheduled_quantity'] for row in plan['batches']] == [D('1'), D('3'), D('0')]
    assert [(row['forecast_date'], row['quantity']) for row in plan['ingredients']] == [
        (DAY, D('2')), (DAY + timedelta(days=2), D('1'))]
    assert not plan['review_required']


@pytest.mark.asyncio
async def test_late_confirmed_inbound_requires_review_when_aggregate_position_hides_shortage(db):
    await stock(db, quantity=0)
    db.add_all([PurchaseOrder(order_id=1, restaurant_id=1, supplier_id=None, order_date=DAY,
                    expected_delivery_date=DAY + timedelta(days=3), status='pending'),
                PurchaseOrderItem(order_item_id=1, restaurant_id=1, order_id=1, ingredient_id=1,
                    quantity_ordered=10, quantity_received=0, unit='kg', unit_price=1, total_item_price=10)])
    await db.commit()
    engine = ReorderForecastEngine(db, 1, 'full')
    supplier = SimpleNamespace(lead_time_days=0, review_period_days=4, shelf_life_days=5,
        order_schedule_type='ad_hoc', unit='kg', min_order_quantity=0, spoilage_rate=0)
    result = await engine.build_reorder_decision(ingredient_id=1, unit='kg',
        daily_forecast=[(DAY + timedelta(days=1), D('10'))],
        lead_time=0, shelf_life_days=5, current_stock=D('0'), current_unit='kg',
        supplier=supplier, as_of_date=DAY, manage_alerts=False)
    assert result['review_required']
    assert result['assumption_warnings']


@pytest.mark.asyncio
async def test_basic_forecasting_uses_the_same_frozen_material_contract(db):
    from app.db.models.forecast_run_ledger_orm import ForecastRunLedger
    from app.services.forecasting_engine_basic import ForecastingEngineBasic
    aggregated = {1: {'unit': 'kg', 'daily_breakdown': [(DAY + timedelta(days=1), D('0.125001'))]}}
    db.add(ForecastRunLedger(restaurant_id=1, run_date=DAY, finalized=True,
        result_snapshot=encode({'version': 1, 'horizon_days': 4, 'reorder_horizon_days': 4,
            'menus': {}, 'batches': [], 'ingredients': [], 'aggregated': aggregated,
            'material_plan': {}, 'history_quality': {'review_required': False}})))
    await db.commit()
    result = await ForecastingEngineBasic(db, 1).run(DAY, horizon_days=4)
    assert result == aggregated
    assert await db.scalar(select(func.count()).select_from(ForecastRunLedger)) == 1


@pytest.mark.asyncio
async def test_planned_prep_derives_fractional_count_and_prepared_waste_is_readable(db):
    db.add(BatchRecipe(batch_recipe_id=2, restaurant_id=1, name='Salsa', yield_quantity=4,
        yield_unit='kg', shelf_life_days=2))
    await db.commit()
    service = PrepService(db, 1, 'full', None)
    created = await service.create_prep_schedule({'batch_recipe_id': 2, 'prep_date': DAY.isoformat(), 'quantity_needed': '2'})
    assert created['prep_batch_count'] == D('0.5')
    await stock(db, kind='batch', item_id=2, quantity=2)
    await db.commit()
    await service.create_waste_log(ingredient_id=None, batch_recipe_id=2, quantity_wasted=D('1'),
        unit='kg', waste_type='waste', reason='overproduction', notes=None, request_key='prepared-waste-read')
    await db.commit()
    rows = await service.get_waste_logs()
    assert len(rows) == 1
    assert rows[0].ingredient_id is None and rows[0].batch_recipe_id == 2
    assert rows[0].cost_impact is None
