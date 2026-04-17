import json
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.inventory_service import InventoryService
from app.services.utils.purchase_order_note_helper import serialize_purchase_order_notes


@pytest.fixture
def inventory_service(mock_db):
    transaction = AsyncMock()
    transaction.__aenter__.return_value = transaction
    transaction.__aexit__.return_value = None
    mock_db.begin = MagicMock(return_value=transaction)
    mock_db.in_transaction = MagicMock(return_value=False)

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
        quantity_received=None,
        unit='lb',
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
    inventory_service.inventory_lot_repo.get_by_purchase_order_item_id.return_value = None
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
        'actual_delivery_date': date(2026, 3, 28),
        'receipt_mode': 'received',
        'requested_item_count': 1,
        'newly_received_item_count': 1,
        'already_received_item_count': 0,
        'received_items': [
            {
                'order_item_id': 11,
                'ingredient_id': 101,
                'lot_id': 401,
                'quantity_ordered': 3.0,
                'quantity_received': 3.0,
                'variance_quantity': 0.0,
                'variance_status': 'matched',
                'unit': 'lb',
                'receipt_status': 'received',
            }
        ],
    }


@pytest.mark.asyncio
async def test_receive_purchase_order_returns_existing_receipt_on_replay(inventory_service):
    inventory_service.purchase_order_repo.get_by_id.return_value = MagicMock(
        status='delivered',
        actual_delivery_date=date(2026, 3, 27),
    )
    purchase_order_item = MagicMock(
        order_item_id=11,
        ingredient_id=101,
        ingredient_supplier_id=201,
        quantity_ordered=3,
        quantity_received=None,
        unit='lb',
    )
    existing_lot = MagicMock(
        lot_id=401,
        quantity=30,
        total_received=3,
        unit='lb',
    )

    inventory_service.purchase_order_item_repo.get_by_field.return_value = [purchase_order_item]
    inventory_service.inventory_lot_repo.get_by_purchase_order_item_id.return_value = existing_lot

    result = await inventory_service.receive_purchase_order(order_id=55)

    inventory_service.inventory_lot_repo.create.assert_not_called()
    inventory_service.inventory_repo.update.assert_not_called()
    inventory_service.purchase_order_repo.update.assert_not_called()
    assert result == {
        'order_id': 55,
        'status': 'delivered',
        'actual_delivery_date': date(2026, 3, 27),
        'receipt_mode': 'already_received',
        'requested_item_count': 1,
        'newly_received_item_count': 0,
        'already_received_item_count': 1,
        'received_items': [
            {
                'order_item_id': 11,
                'ingredient_id': 101,
                'lot_id': 401,
                'quantity_ordered': 3.0,
                'quantity_received': 3.0,
                'variance_quantity': 0.0,
                'variance_status': 'matched',
                'unit': 'lb',
                'receipt_status': 'already_received',
            }
        ],
    }


@pytest.mark.asyncio
async def test_receive_purchase_order_rejects_replay_with_changed_delivery_date(inventory_service):
    inventory_service.purchase_order_repo.get_by_id.return_value = MagicMock(
        status='delivered',
        actual_delivery_date=date(2026, 3, 27),
    )

    with pytest.raises(ValueError, match='delivery date cannot be changed'):
        await inventory_service.receive_purchase_order(
            order_id=55,
            actual_delivery_date=date(2026, 3, 28),
        )

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
async def test_update_purchase_order_status_refreshes_stale_expected_delivery_on_submit(
    inventory_service,
):
    inventory_service.purchase_order_repo.get_by_id.return_value = MagicMock(
        expected_delivery_date=date(2026, 4, 4),
    )
    inventory_service.purchase_order_item_repo.get_by_field.return_value = [
        MagicMock(ingredient_supplier_id=201),
        MagicMock(ingredient_supplier_id=202),
    ]
    inventory_service.ingredient_supplier_repo.get_by_id = AsyncMock(
        side_effect=[
            MagicMock(lead_time_days=1),
            MagicMock(lead_time_days=3),
        ]
    )

    with patch('app.services.inventory_service.date') as mock_date:
        mock_date.today.return_value = date(2026, 4, 5)
        result = await inventory_service.update_purchase_order_status(55, 'pending')

    inventory_service.purchase_order_repo.update.assert_awaited_once_with(
        55,
        {'status': 'pending', 'expected_delivery_date': date(2026, 4, 8)},
    )
    assert result == {
        'order_id': 55,
        'status': 'pending',
        'expected_delivery_date': date(2026, 4, 8),
        'expected_delivery_refreshed': True,
    }


@pytest.mark.asyncio
async def test_create_purchase_orders_from_suggestions_passes_review_context(
    inventory_service,
):
    inventory_service.create_purchase_order = AsyncMock(
        return_value={'order_id': 99, 'total_order_price': 42.0, 'status': 'cart'}
    )

    await inventory_service.create_purchase_orders_from_suggestions(
        suggestions=[
            {
                'ingredient_id': 101,
                'ingredient_name': 'Garlic',
                'ingredient_supplier_id': 201,
                'supplier_id': 301,
                'supplier_name': 'Produce Co',
                'quantity_to_order': 12.0,
                'packs_to_order': 2,
                'unit': 'lb',
                'unit_price': 4.5,
                'line_total': 54.0,
                'lead_time_days': 2,
                'lead_demand': 5.0,
                'shelf_demand': 7.0,
                'explanation': {
                    'summary': 'Suggested because stock is below reorder point.',
                    'why_reorder': {
                        'current_stock': 1.0,
                        'current_unit': 'lb',
                        'reorder_point': 4.0,
                        'lead_demand': 2.0,
                        'shelf_demand': 3.0,
                        'safety_stock': 1.0,
                        'reorder_target': 6.0,
                    },
                    'quantity_factors': {
                        'raw_order_quantity': 5.0,
                        'buffered_quantity': 5.5,
                        'final_quantity_before_pack_rounding': 5.5,
                        'converted_quantity_needed': 5.5,
                        'pack_size': 1,
                        'quantity_per_pack_item': 6.0,
                        'quantity_per_pack': 6.0,
                        'packs_to_order': 2,
                        'total_quantity_ordered': 12.0,
                        'inventory_unit': 'lb',
                        'supplier_unit': 'lb',
                    },
                    'policy_factors': {
                        'service_level_z': 1.65,
                        'abc_class': 'B',
                        'abc_multiplier': 1.1,
                        'moq': 4.0,
                        'moq_floor': 4.0,
                        'max_allowed': 100.0,
                    },
                    'supplier_factors': {
                        'selected_supplier': 'Produce Co',
                        'selection_rule': 'preferred_lowest_priority',
                        'preferred_supplier_available': True,
                        'selected_supplier_priority': 1,
                        'selected_supplier_preferred': True,
                        'pricing_available': True,
                    },
                    'assumption_flags': {
                        'inventory_source': 'inventory_summary',
                        'lead_time_source': 'supplier',
                        'moq_source': 'supplier',
                        'shelf_life_source': 'inventory',
                        'unit_conversion_fallback': False,
                        'pricing_missing': False,
                        'abc_defaulted': False,
                    },
                },
            }
        ],
        notes='Operator note',
    )

    _, kwargs = inventory_service.create_purchase_order.await_args
    assert kwargs['notes'] == 'Operator note'
    assert kwargs['review_context']['source_type'] == 'suggestion'
    assert len(kwargs['review_context']['explanation_items']) == 1
    assert kwargs['review_context']['explanation_items'][0]['ingredient_name'] == 'Garlic'


@pytest.mark.asyncio
async def test_create_purchase_orders_from_suggestions_supports_unspecified_supplier_group(
    inventory_service,
):
    inventory_service.create_purchase_order = AsyncMock(
        return_value={'order_id': 100, 'total_order_price': 0.0, 'status': 'cart'}
    )

    result = await inventory_service.create_purchase_orders_from_suggestions(
        suggestions=[
            {
                'ingredient_id': 101,
                'ingredient_name': 'Garlic',
                'ingredient_supplier_id': None,
                'supplier_id': None,
                'supplier_name': 'Unspecified supplier',
                'quantity_to_order': 12.0,
                'packs_to_order': 12,
                'unit': 'lb',
                'unit_price': 0.0,
                'line_total': 0.0,
                'lead_time_days': 0,
                'lead_demand': 5.0,
                'shelf_demand': 7.0,
                'explanation': None,
            }
        ]
    )

    assert result == [{'order_id': 100, 'total_order_price': 0.0, 'status': 'cart'}]
    inventory_service.create_purchase_order.assert_awaited_once()
    kwargs = inventory_service.create_purchase_order.await_args.kwargs
    assert kwargs['supplier_id'] is None
    assert kwargs['expected_delivery_date'] is None


@pytest.mark.asyncio
async def test_get_purchase_order_detail_parses_review_context_and_stale_eta(inventory_service):
    purchase_order = MagicMock(
        order_id=55,
        restaurant_id=1,
        supplier_id=301,
        order_date=date(2026, 4, 2),
        expected_delivery_date=date(2026, 4, 4),
        actual_delivery_date=None,
        status='pending',
        total_order_price=Decimal('42.00'),
        notes=serialize_purchase_order_notes(
            user_note='Operator note',
            system_note='[EOD_AUTO run_date=2026-04-02 supplier_id=301]',
            review_context={
                'source_type': 'eod_auto',
                'source_run_date': '2026-04-02',
                'explanation_items': [
                    {
                        'ingredient_id': 101,
                        'ingredient_name': 'Garlic',
                        'quantity_to_order': 12.0,
                        'unit': 'lb',
                    }
                ],
            },
        ),
    )
    inventory_service.purchase_order_repo.get_by_id.return_value = purchase_order
    inventory_service.purchase_order_item_repo.get_by_field.return_value = [
        MagicMock(
            order_item_id=11,
            order_id=55,
            ingredient_id=101,
            ingredient_supplier_id=201,
            quantity_ordered=12,
            unit='lb',
            unit_price=3.5,
            total_item_price=42.0,
        )
    ]
    inventory_service.supplier_repo = AsyncMock()
    inventory_service.supplier_repo.get_by_id.return_value = MagicMock(name='Produce Co')
    inventory_service.ingredient_repo.get_by_id.return_value = MagicMock(name='Garlic')

    with patch('app.services.inventory_service.date') as mock_date:
        mock_date.today.return_value = date(2026, 4, 5)
        result = await inventory_service.get_purchase_order_detail(55)

    assert result['notes'] == 'Operator note'
    assert result['expected_delivery_stale'] is True
    assert result['review_context']['source_type'] == 'eod_auto'
    assert result['review_context']['explanation_items'][0]['ingredient_name'] == 'Garlic'


def test_serialize_purchase_order_notes_serializes_review_context_dates_and_decimals():
    notes = serialize_purchase_order_notes(
        system_note='[EOD_AUTO run_date=2026-04-12 supplier_id=301]',
        review_context={
            'source_type': 'eod_auto',
            'source_run_date': date(2026, 4, 12),
            'explanation_items': [
                {
                    'ingredient_id': 101,
                    'quantity_to_order': Decimal('12.50'),
                    'usable_until_date': date(2026, 4, 14),
                }
            ],
        },
    )

    parsed = json.loads(notes)
    assert parsed['review_context']['source_run_date'] == '2026-04-12'
    assert parsed['review_context']['explanation_items'][0]['quantity_to_order'] == 12.5
    assert parsed['review_context']['explanation_items'][0]['usable_until_date'] == '2026-04-14'


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
    inventory_service.inventory_lot_repo.get_by_purchase_order_item_id.return_value = None

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


@pytest.mark.asyncio
async def test_receive_purchase_order_reuses_existing_transaction(inventory_service):
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

    inventory_service.db.in_transaction.return_value = True
    inventory_service.purchase_order_repo.get_by_id.return_value = purchase_order
    inventory_service.purchase_order_item_repo.get_by_field.return_value = [purchase_order_item]
    inventory_service.inventory_lot_repo.get_by_purchase_order_item_id.return_value = None
    inventory_service.ingredient_supplier_repo.get_by_id.return_value = ingredient_supplier
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_repo.get_by_id.return_value = ingredient
    inventory_service.inventory_lot_repo.create.return_value = lot

    result = await inventory_service.receive_purchase_order(
        order_id=55,
        actual_delivery_date=date(2026, 3, 28),
    )

    inventory_service.db.begin.assert_not_called()
    inventory_service.purchase_order_repo.update.assert_awaited_once_with(
        55,
        {'status': 'delivered', 'actual_delivery_date': date(2026, 3, 28)},
    )
    assert result['status'] == 'delivered'
    assert result['receipt_mode'] == 'received'


@pytest.mark.asyncio
async def test_receive_purchase_order_uses_item_level_received_quantities(inventory_service):
    purchase_order = MagicMock(status='pending', actual_delivery_date=None)
    purchase_order_item = MagicMock(
        order_item_id=11,
        ingredient_id=101,
        ingredient_supplier_id=201,
        quantity_ordered=3,
        quantity_received=None,
        unit='lb',
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
    inventory_service.inventory_lot_repo.get_by_purchase_order_item_id.return_value = None
    inventory_service.ingredient_supplier_repo.get_by_id.return_value = ingredient_supplier
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_repo.get_by_id.return_value = ingredient
    inventory_service.inventory_lot_repo.create.return_value = lot

    result = await inventory_service.receive_purchase_order(
        order_id=55,
        actual_delivery_date=date(2026, 3, 28),
        received_items=[{'order_item_id': 11, 'quantity_received': 2}],
    )

    lot_payload = inventory_service.inventory_lot_repo.create.await_args.args[0]
    assert float(lot_payload['total_received']) == 2.0
    inventory_service.purchase_order_item_repo.update.assert_any_await(
        11,
        {'quantity_received': Decimal('2.0')},
    )
    assert result['received_items'][0]['quantity_ordered'] == 3.0
    assert result['received_items'][0]['quantity_received'] == 2
    assert result['received_items'][0]['variance_quantity'] == -1.0
    assert result['received_items'][0]['variance_status'] == 'short'


@pytest.mark.asyncio
async def test_receive_purchase_order_resumes_partial_receipt_without_replaying_existing_lots(
    inventory_service,
):
    purchase_order = MagicMock(status='pending', actual_delivery_date=None)
    existing_item = MagicMock(
        order_item_id=11,
        ingredient_id=101,
        ingredient_supplier_id=201,
        quantity_ordered=3,
        quantity_received=3,
        unit='lb',
    )
    missing_item = MagicMock(
        order_item_id=12,
        ingredient_id=102,
        ingredient_supplier_id=202,
        quantity_ordered=4,
        quantity_received=None,
        unit='lb',
    )
    existing_lot = MagicMock(lot_id=401, quantity=30, total_received=3, unit='lb')
    ingredient_supplier = MagicMock(
        ingredient_id=102,
        unit='lb',
        pack_size=1,
        quantity_per_pack_item=2,
        shelf_life_days=5,
    )
    inventory = MagicMock(inventory_id=302, quantity_on_hand=10, unit='lb')
    ingredient = MagicMock(unit='lb', average_weight_per_unit=None)
    new_lot = MagicMock(lot_id=402)

    inventory_service.purchase_order_repo.get_by_id.return_value = purchase_order
    inventory_service.purchase_order_item_repo.get_by_field.return_value = [existing_item, missing_item]
    inventory_service.inventory_lot_repo.get_by_purchase_order_item_id = AsyncMock(
        side_effect=[existing_lot, None]
    )
    inventory_service.ingredient_supplier_repo.get_by_id.return_value = ingredient_supplier
    inventory_service.inventory_repo.get_inventory_by_ingredient.return_value = inventory
    inventory_service.ingredient_repo.get_by_id.return_value = ingredient
    inventory_service.inventory_lot_repo.create.return_value = new_lot

    result = await inventory_service.receive_purchase_order(
        order_id=55,
        actual_delivery_date=date(2026, 3, 28),
    )

    inventory_service.inventory_lot_repo.create.assert_awaited_once()
    create_payload = inventory_service.inventory_lot_repo.create.await_args.args[0]
    assert create_payload['purchase_order_item_id'] == 12
    inventory_service.inventory_repo.update.assert_awaited_once()
    inventory_service.purchase_order_repo.update.assert_awaited_once_with(
        55,
        {'status': 'delivered', 'actual_delivery_date': date(2026, 3, 28)},
    )
    assert result['received_items'] == [
        {
            'order_item_id': 11,
            'ingredient_id': 101,
            'lot_id': 401,
            'quantity_ordered': 3.0,
            'quantity_received': 3.0,
            'variance_quantity': 0.0,
            'variance_status': 'matched',
            'unit': 'lb',
            'receipt_status': 'already_received',
        },
        {
            'order_item_id': 12,
            'ingredient_id': 102,
            'lot_id': 402,
            'quantity_ordered': 4.0,
            'quantity_received': 4.0,
            'variance_quantity': 0.0,
            'variance_status': 'matched',
            'unit': 'lb',
            'receipt_status': 'received',
        },
    ]
    assert result['receipt_mode'] == 'resumed'
    assert result['requested_item_count'] == 2
    assert result['newly_received_item_count'] == 1
    assert result['already_received_item_count'] == 1