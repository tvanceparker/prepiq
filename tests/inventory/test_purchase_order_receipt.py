from datetime import date
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.inventory_service import InventoryService


@pytest.fixture
def inventory_service(mock_db):
    transaction = AsyncMock()
    transaction.__aenter__.return_value = transaction
    transaction.__aexit__.return_value = None
    mock_db.begin = MagicMock(return_value=transaction)

    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.purchase_order_repo = AsyncMock()
    service.purchase_order_item_repo = AsyncMock()
    service.inventory_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.ingredient_supplier_repo = AsyncMock()
    service.ingredient_repo = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_receive_purchase_order_creates_lots_updates_inventory_and_marks_delivered(
    inventory_service,
):
    purchase_order = MagicMock(status='pending', actual_delivery_date=None)
    purchase_order_item = MagicMock(
        order_item_id=11,
        ingredient_id=101,
        ingredient_supplier_id=201,
        quantity_ordered=3,
    )
    ingredient_supplier = MagicMock(
        ingredient_id=101,
        unit='lb',
        pack_size=2,
        quantity_per_pack_item=5,
        shelf_life_days=7,
    )
    inventory = MagicMock(inventory_id=301, quantity_on_hand=10, unit='lb')
    ingredient = MagicMock(unit='lb', average_weight_per_unit=None)
    lot = MagicMock(lot_id=401)

    inventory_service.purchase_order_repo.get_by_id.return_value = purchase_order
    inventory_service.purchase_order_item_repo.get_by_field.return_value = [purchase_order_item]
    inventory_service.ingredient_supplier_repo.get_by_id.return_value = ingredient_supplier
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_repo.get_by_id.return_value = ingredient
    inventory_service.inventory_lot_repo.create.return_value = lot

    result = await inventory_service.receive_purchase_order(
        order_id=55,
        actual_delivery_date=date(2026, 3, 28),
    )

    inventory_service.inventory_lot_repo.create.assert_awaited_once()
    lot_payload = inventory_service.inventory_lot_repo.create.await_args.args[0]
    assert lot_payload['inventory_id'] == 301
    assert lot_payload['ingredient_id'] == 101
    assert float(lot_payload['quantity']) == 30.0
    assert lot_payload['total_received'] == 3
    assert lot_payload['receipt_source'] == 'purchase_order'
    assert lot_payload['purchase_order_id'] == 55
    assert lot_payload['purchase_order_item_id'] == 11

    inventory_service.inventory_repo.update.assert_awaited_once()
    update_args = inventory_service.inventory_repo.update.await_args.args
    assert update_args[0] == 301
    assert float(update_args[1]['quantity_on_hand']) == 40.0
    assert update_args[1]['last_delivery_date'] == date(2026, 3, 28)

    inventory_service.purchase_order_repo.update.assert_awaited_once_with(
        55,
        {'status': 'delivered', 'actual_delivery_date': date(2026, 3, 28)},
    )

    assert result == {
        'order_id': 55,
        'status': 'delivered',
        'actual_delivery_date': '2026-03-28',
        'received_items': [
            {
                'order_item_id': 11,
                'ingredient_id': 101,
                'lot_id': 401,
                'quantity_received': 30.0,
                'unit': 'lb',
            }
        ],
    }


@pytest.mark.asyncio
async def test_receive_purchase_order_rejects_duplicate_receipt(inventory_service):
    inventory_service.purchase_order_repo.get_by_id.return_value = MagicMock(
        status='delivered',
        actual_delivery_date=date(2026, 3, 27),
    )

    with pytest.raises(ValueError, match='already been received'):
        await inventory_service.receive_purchase_order(order_id=55)

    inventory_service.purchase_order_item_repo.get_by_field.assert_not_called()
    inventory_service.inventory_lot_repo.create.assert_not_called()
    inventory_service.inventory_repo.update.assert_not_called()


@pytest.mark.asyncio
async def test_update_purchase_order_status_delivered_delegates_to_receipt(inventory_service):
    inventory_service.receive_purchase_order = AsyncMock(
        return_value={'order_id': 55, 'status': 'delivered'}
    )

    result = await inventory_service.update_purchase_order_status(55, 'delivered')

    inventory_service.receive_purchase_order.assert_awaited_once_with(55)
    assert result == {'order_id': 55, 'status': 'delivered'}


@pytest.mark.asyncio
async def test_add_inventory_from_lots_marks_manual_receipt_provenance(inventory_service):
    ingredient_supplier = MagicMock(
        ingredient_id=101,
        unit='lb',
        pack_size=1,
        quantity_per_pack_item=2,
        shelf_life_days=3,
    )
    inventory = MagicMock(inventory_id=301, quantity_on_hand=5, unit='lb')
    ingredient = MagicMock(unit='lb', average_weight_per_unit=None)
    lot = MagicMock(lot_id=999)

    inventory_service.ingredient_supplier_repo.get_by_id.return_value = ingredient_supplier
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_repo.get_by_id.return_value = ingredient
    inventory_service.inventory_lot_repo.create.return_value = lot

    result = await inventory_service.add_inventory_from_lots(
        ingredient_supplier_id=201,
        total_received=4,
        delivery_date=date(2026, 3, 28),
    )

    lot_payload = inventory_service.inventory_lot_repo.create.await_args.args[0]
    assert lot_payload['receipt_source'] == 'manual_receipt'
    assert lot_payload['purchase_order_id'] is None
    assert lot_payload['purchase_order_item_id'] is None
    assert result['lot_id'] == 999