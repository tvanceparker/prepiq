from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.inventory_service import InventoryService


class _ScalarResult:
    def __init__(self, values):
        self._values = values

    def all(self):
        return self._values


class _ExecuteResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return _ScalarResult(self._values)


@pytest.fixture
def inventory_service(mock_db):
    service = InventoryService(mock_db, 1, 'pro', employee_id=7)
    service.ingredient_repo = AsyncMock()
    service.batch_recipe_repo = AsyncMock()
    service.ingredient_supplier_repo = AsyncMock()
    service.supplier_repo = AsyncMock()
    service.inventory_repo = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_get_stock_movements_distinguishes_po_and_manual_receipts(inventory_service):
    po_lot = MagicMock(
        delivery_date=date(2026, 3, 28),
        batch_recipe_id=None,
        ingredient_id=101,
        ingredient_supplier_id=201,
        total_received=Decimal('3.00'),
        quantity=Decimal('30.00'),
        unit='lb',
        lot_id=401,
        receipt_source='purchase_order',
        purchase_order_id=55,
        purchase_order_item_id=66,
    )
    manual_lot = MagicMock(
        delivery_date=date(2026, 3, 29),
        batch_recipe_id=None,
        ingredient_id=102,
        ingredient_supplier_id=None,
        total_received=Decimal('2.00'),
        quantity=Decimal('2.00'),
        unit='each',
        lot_id=402,
        receipt_source='manual_receipt',
        purchase_order_id=None,
        purchase_order_item_id=None,
    )

    inventory_service.ingredient_repo.get_all.return_value = [
        MagicMock(ingredient_id=101, name='Tomatoes'),
        MagicMock(ingredient_id=102, name='Lemons'),
    ]
    inventory_service.batch_recipe_repo.get_all.return_value = []
    ingredient_supplier = MagicMock()
    ingredient_supplier.supplier_id = 301
    supplier = MagicMock()
    supplier.name = 'Fresh Farms'
    inventory_service.ingredient_supplier_repo.get_by_id.return_value = ingredient_supplier
    inventory_service.supplier_repo.get_by_id.return_value = supplier
    inventory_service.db.execute = AsyncMock(
        side_effect=[_ExecuteResult([po_lot, manual_lot]), _ExecuteResult([])]
    )

    movements = await inventory_service.get_stock_movements(
        start_date=date(2026, 3, 28),
        end_date=date(2026, 3, 29),
    )

    assert len(movements) == 2

    po_movement = next(m for m in movements if m['lot_id'] == 401)
    assert po_movement['type'] == 'Purchase Receipt'
    assert po_movement['receipt_source'] == 'purchase_order'
    assert po_movement['purchase_order_id'] == 55
    assert po_movement['purchase_order_item_id'] == 66
    assert po_movement['source_or_destination'] == 'Fresh Farms'
    assert po_movement['notes'] == 'Received via PO #55 item #66'

    manual_movement = next(m for m in movements if m['lot_id'] == 402)
    assert manual_movement['type'] == 'Manual Receipt'
    assert manual_movement['receipt_source'] == 'manual_receipt'
    assert manual_movement['purchase_order_id'] is None
    assert manual_movement['purchase_order_item_id'] is None
    assert manual_movement['source_or_destination'] == 'Manual Entry'
    assert manual_movement['notes'] == 'Manual lot receipt'


@pytest.mark.asyncio
async def test_get_stock_movements_labels_signed_manual_adjustments(inventory_service):
    added_log = MagicMock(
        used_date=date(2026, 3, 28),
        ingredient_id=101,
        lot_id=401,
        used_quantity=Decimal('-3.00'),
        unit='lb',
        usage_type='manual_adjustment',
        reference_id=None,
        notes='Count reconciliation added stock',
    )
    removed_log = MagicMock(
        used_date=date(2026, 3, 29),
        ingredient_id=101,
        lot_id=401,
        used_quantity=Decimal('2.00'),
        unit='lb',
        usage_type='manual_adjustment',
        reference_id=None,
        notes='Count reconciliation removed stock',
    )

    inventory_service.ingredient_repo.get_all.return_value = [
        MagicMock(ingredient_id=101, name='Tomatoes'),
    ]
    inventory_service.batch_recipe_repo.get_all.return_value = []
    inventory_service.db.execute = AsyncMock(
        side_effect=[_ExecuteResult([]), _ExecuteResult([added_log, removed_log])]
    )

    movements = await inventory_service.get_stock_movements(
        start_date=date(2026, 3, 28),
        end_date=date(2026, 3, 29),
    )

    added_movement = next(m for m in movements if m['notes'] == 'Count reconciliation added stock')
    assert added_movement['type'] == 'Manual Stock Added'
    assert added_movement['quantity'] == 3.0
    assert added_movement['source_or_destination'] == 'Manual Entry'

    removed_movement = next(
        m for m in movements if m['notes'] == 'Count reconciliation removed stock'
    )
    assert removed_movement['type'] == 'Manual Stock Removed'
    assert removed_movement['quantity'] == -2.0
    assert removed_movement['source_or_destination'] == 'Manual Entry'