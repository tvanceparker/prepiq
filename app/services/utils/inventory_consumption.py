"""Transactional, tenant-scoped FEFO consumption of raw or prepared stock.

Callers own commit/rollback. Lock summaries before reading movement totals so
concurrent retries of a reference cannot both deduct the same requirement.
"""
from datetime import date, datetime, time
from decimal import Decimal
from sqlalchemy import select
from app.db.models.inventory_orm import Inventory
from app.db.models.inventory_lot_orm import InventoryLot
from app.db.models.inventory_usage_log_orm import InventoryUsageLog
from app.services.utils.unit_conversion import convert_unit


def remaining_quantity(lot, logs):
    remaining = Decimal(str(lot.quantity or 0))
    for log in logs:
        quantity = convert_unit(Decimal(str(log.used_quantity)), log.unit, lot.unit)
        remaining -= quantity  # negative adjustments add stock
    return max(remaining, Decimal('0'))


class InventoryConsumption:
    def __init__(self, db, restaurant_id):
        self.db, self.restaurant_id = db, restaurant_id

    async def consume(self, *, item_kind, item_id, quantity, unit,
                      reference_type, reference_id, business_date=None, usage_type='sale', include_expired=False, notes=None):
        day = business_date or date.today()
        if quantity <= 0 or not quantity.is_finite():
            raise ValueError('Consumption quantity must be finite and positive')
        if item_kind == 'ingredient':
            predicate = Inventory.ingredient_id == item_id
        elif item_kind == 'batch':
            predicate = Inventory.inventory_id.in_(select(InventoryLot.inventory_id).where(
                InventoryLot.restaurant_id == self.restaurant_id,
                InventoryLot.batch_recipe_id == item_id))
        else:
            raise ValueError(f'Unsupported inventory item kind: {item_kind}')
        inventories = (await self.db.execute(select(Inventory).where(
            Inventory.restaurant_id == self.restaurant_id, predicate
        ).order_by(Inventory.inventory_id).with_for_update().execution_options(populate_existing=True))).scalars().all()
        if not inventories:
            raise ValueError(f'No inventory for {item_kind} {item_id}')
        ids = [inventory.inventory_id for inventory in inventories]
        previous = (await self.db.execute(select(InventoryUsageLog).where(
            InventoryUsageLog.restaurant_id == self.restaurant_id,
            InventoryUsageLog.inventory_id.in_(ids),
            InventoryUsageLog.reference_type == reference_type,
            InventoryUsageLog.reference_id == reference_id,
            InventoryUsageLog.usage_type == usage_type).with_for_update().execution_options(populate_existing=True))).unique().scalars().all()
        deducted = sum((convert_unit(Decimal(str(log.used_quantity)), log.unit, unit)
                        for log in previous), Decimal('0'))
        if reference_type == 'eod_sales':
            realtime = (await self.db.execute(select(InventoryUsageLog).where(
                InventoryUsageLog.restaurant_id == self.restaurant_id,
                InventoryUsageLog.inventory_id.in_(ids),
                InventoryUsageLog.reference_type.in_(['sale', 'order']),
                InventoryUsageLog.usage_type == 'sale',
                InventoryUsageLog.business_date == day).with_for_update().execution_options(populate_existing=True))).unique().scalars().all()
            deducted += sum((convert_unit(Decimal(str(log.used_quantity)), log.unit, unit)
                             for log in realtime), Decimal('0'))
        needed = quantity - deducted
        if needed < 0:
            raise ValueError('Reference requirement decreased; reconcile the committed movement explicitly')
        if needed == 0:
            return []
        lots = (await self.db.execute(select(InventoryLot).where(
            InventoryLot.restaurant_id == self.restaurant_id,
            InventoryLot.inventory_id.in_(ids)
        ).order_by(InventoryLot.lot_id).with_for_update().execution_options(populate_existing=True))).scalars().all()
        logs = (await self.db.execute(select(InventoryUsageLog).where(
            InventoryUsageLog.restaurant_id == self.restaurant_id,
            InventoryUsageLog.lot_id.in_([lot.lot_id for lot in lots])
        ).with_for_update().execution_options(populate_existing=True))).unique().scalars().all() if lots else []
        balances = {inventory.inventory_id: convert_unit(
            Decimal(str(inventory.quantity_on_hand or 0)), inventory.unit, unit)
            for inventory in inventories}
        by_id = {inventory.inventory_id: inventory for inventory in inventories}
        plan = []
        for lot in sorted(lots, key=lambda lot: (
                lot.spoilage_expected_date is None, lot.spoilage_expected_date or date.max,
                lot.delivery_date, lot.lot_id)):
            status = getattr(lot.status, 'value', lot.status)
            if status != 'available' or lot.delivery_date > day:
                continue
            # Expiry is the last usable business day; EOD writes off its remainder.
            if not include_expired and lot.spoilage_expected_date and lot.spoilage_expected_date < day:
                continue
            available = convert_unit(remaining_quantity(lot, [log for log in logs
                                     if log.lot_id == lot.lot_id]), lot.unit, unit)
            take = min(needed, available, max(balances[lot.inventory_id], Decimal('0')))
            if take > 0:
                plan.append((lot.inventory_id, lot.lot_id, take))
                balances[lot.inventory_id] -= take
                needed -= take
            if needed <= 0:
                break
        # Legacy stock without any lot history has explicit, unallocated movements.
        if not lots and item_kind == 'ingredient':
            for inventory in inventories:
                take = min(needed, max(balances[inventory.inventory_id], Decimal('0')))
                if take > 0:
                    plan.append((inventory.inventory_id, None, take))
                    needed -= take
        if needed > 0:
            raise ValueError(f'Insufficient usable {item_kind} {item_id}: short {needed} {unit}')
        result = []
        for inventory_id, lot_id, take in plan:
            inventory = by_id[inventory_id]
            in_stock_unit = convert_unit(take, unit, inventory.unit)
            inventory.quantity_on_hand = Decimal(str(inventory.quantity_on_hand)) - in_stock_unit
            self.db.add(InventoryUsageLog(
                restaurant_id=self.restaurant_id, inventory_id=inventory_id,
                ingredient_id=item_id if item_kind == 'ingredient' else None,
                lot_id=lot_id, used_quantity=in_stock_unit, unit=inventory.unit,
                usage_type=usage_type, reference_type=reference_type, reference_id=reference_id,
                business_date=day, used_date=datetime.utcnow(), notes=notes))
            result.append({f'{"ingredient" if item_kind == "ingredient" else "batch_recipe"}_id': item_id,
                           'inventory_id': inventory_id, 'lot_id': lot_id,
                           'quantity_deducted': float(take), 'unit': unit, 'source': item_kind})
        await self.db.flush()
        return result
