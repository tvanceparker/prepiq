from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.inventory_service import InventoryService


class _AsyncBegin:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


@pytest.fixture
def inventory_service(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.alert_repo = AsyncMock()
    service.discrepancy_repo = AsyncMock()
    service.discrepancy_repo.get_open.return_value = []
    service.discrepancy_repo.get_open_by_item.return_value = []
    service.discrepancy_repo.get_history.return_value = []
    service.ingredient_repo = AsyncMock()
    service.batch_recipe_repo = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_get_inventory_deduction_discrepancies_returns_ingredient_alerts(inventory_service):
    alert = SimpleNamespace(
        alert_id=42,
        alert_type='Inventory:DeductionFailed',
        message='Inventory deduction failed for olive oil.',
        severity='urgent',
        status='Active',
        is_acknowledged=False,
        date_created=datetime(2026, 4, 1, 12, 0, 0),
        meta={
            'ingredient_id': 101,
            'ingredient_name': 'Olive Oil',
            'required_quantity': 132,
            'available_quantity': 96,
            'current_quantity_on_hand': 96,
            'shortfall_quantity': 36,
            'unit': 'oz',
            'reference_type': 'eod_sales',
            'reference_id': 20260401,
            'attempted_day': '2026-04-01',
        },
    )
    inventory_service.alert_repo.get_open_inventory_deduction_alerts.return_value = [alert]
    inventory_service.ingredient_repo.get_by_id.return_value = SimpleNamespace(name='Olive Oil')

    result = await inventory_service.get_inventory_deduction_discrepancies()

    assert result == [
        {
            'alert_id': 42,
            'alert_type': 'Inventory:DeductionFailed',
            'message': 'Inventory deduction failed for olive oil.',
            'severity': 'urgent',
            'status': 'Active',
            'is_acknowledged': False,
            'date_created': '2026-04-01T12:00:00',
            'item_kind': 'ingredient',
            'ingredient_id': 101,
            'batch_recipe_id': None,
            'item_name': 'Olive Oil',
            'unit': 'oz',
            'required_quantity': 132.0,
            'available_quantity': 96.0,
            'current_quantity_on_hand': 96.0,
            'shortfall_quantity': 36.0,
            'reference_type': 'eod_sales',
            'reference_id': 20260401,
            'attempted_day': '2026-04-01',
        }
    ]


@pytest.mark.asyncio
async def test_get_inventory_deduction_discrepancies_returns_persisted_rows(inventory_service):
    persisted = SimpleNamespace(
        discrepancy_id=9,
        alert_id=42,
        message='Inventory deduction failed for olive oil.',
        severity='urgent',
        status='Active',
        is_acknowledged=False,
        date_created=datetime(2026, 4, 3, 8, 0, 0),
        item_kind='ingredient',
        ingredient_id=101,
        batch_recipe_id=None,
        item_name='Olive Oil',
        unit='oz',
        required_quantity=132,
        available_quantity=96,
        current_quantity_on_hand=96,
        shortfall_quantity=36,
        reference_type='eod_sales',
        reference_id=20260403,
        attempted_day=datetime(2026, 4, 3).date(),
    )
    inventory_service.discrepancy_repo.get_open.return_value = [persisted]
    inventory_service.alert_repo.get_open_inventory_deduction_alerts.return_value = []

    result = await inventory_service.get_inventory_deduction_discrepancies()

    assert result == [
        {
            'alert_id': 42,
            'alert_type': 'Inventory:DeductionFailed',
            'message': 'Inventory deduction failed for olive oil.',
            'severity': 'urgent',
            'status': 'Active',
            'is_acknowledged': False,
            'date_created': '2026-04-03T08:00:00',
            'item_kind': 'ingredient',
            'ingredient_id': 101,
            'batch_recipe_id': None,
            'item_name': 'Olive Oil',
            'unit': 'oz',
            'required_quantity': 132.0,
            'available_quantity': 96.0,
            'current_quantity_on_hand': 96.0,
            'shortfall_quantity': 36.0,
            'reference_type': 'eod_sales',
            'reference_id': 20260403,
            'attempted_day': '2026-04-03',
        }
    ]


@pytest.mark.asyncio
async def test_get_inventory_deduction_discrepancies_returns_batch_alerts(inventory_service):
    alert = SimpleNamespace(
        alert_id=77,
        alert_type='Inventory:DeductionFailed',
        message='Inventory deduction failed for batch pico.',
        severity=SimpleNamespace(value='warning'),
        status='Acknowledged',
        is_acknowledged=True,
        date_created=datetime(2026, 4, 1, 8, 30, 0),
        meta={
            'batch_recipe_id': 501,
            'batch_recipe_name': 'Pico de Gallo',
            'required_quantity': '12.5',
            'available_quantity': '4.0',
            'current_quantity_on_hand': '4.0',
            'shortfall_quantity': '8.5',
            'unit': 'qt',
        },
    )
    inventory_service.alert_repo.get_open_inventory_deduction_alerts.return_value = [alert]
    inventory_service.batch_recipe_repo.get_by_id.return_value = SimpleNamespace(name='Pico de Gallo')

    result = await inventory_service.get_inventory_deduction_discrepancies()

    assert result[0]['item_kind'] == 'batch'
    assert result[0]['batch_recipe_id'] == 501
    assert result[0]['item_name'] == 'Pico de Gallo'
    assert result[0]['severity'] == 'warning'
    assert result[0]['shortfall_quantity'] == 8.5


@pytest.mark.asyncio
async def test_get_inventory_deduction_discrepancies_derives_missing_shortfall(inventory_service):
    alert = SimpleNamespace(
        alert_id=91,
        alert_type='Inventory:DeductionFailed',
        message='Inventory deduction failed for flour.',
        severity='urgent',
        status='Active',
        is_acknowledged=False,
        date_created=datetime(2026, 4, 2, 9, 0, 0),
        meta={
            'ingredient_id': 201,
            'ingredient_name': 'Flour',
            'required_quantity': 12.95,
            'available_quantity': 0,
            'current_quantity_on_hand': 0,
            'unit': 'lb',
        },
    )
    inventory_service.alert_repo.get_open_inventory_deduction_alerts.return_value = [alert]
    inventory_service.ingredient_repo.get_by_id.return_value = SimpleNamespace(name='Flour')

    result = await inventory_service.get_inventory_deduction_discrepancies()

    assert result[0]['required_quantity'] == 12.95
    assert result[0]['current_quantity_on_hand'] == 0.0
    assert result[0]['shortfall_quantity'] == 12.95


@pytest.mark.asyncio
async def test_get_inventory_deduction_discrepancies_uses_available_as_current_when_missing(inventory_service):
    alert = SimpleNamespace(
        alert_id=92,
        alert_type='Inventory:DeductionFailed',
        message='Inventory deduction failed for salmon fillet.',
        severity='urgent',
        status='Active',
        is_acknowledged=False,
        date_created=datetime(2026, 4, 2, 10, 0, 0),
        meta={
            'ingredient_id': 501,
            'required_quantity': 12.95,
            'available_quantity': 8.0,
            'unit': 'lb',
        },
    )
    inventory_service.alert_repo.get_open_inventory_deduction_alerts.return_value = [alert]
    inventory_service.ingredient_repo.get_by_id.return_value = SimpleNamespace(name='Salmon Fillet')

    result = await inventory_service.get_inventory_deduction_discrepancies()

    assert result[0]['current_quantity_on_hand'] == 8.0
    assert result[0]['shortfall_quantity'] == 4.95
    assert result[0]['item_name'] == 'Salmon Fillet'


@pytest.mark.asyncio
async def test_get_inventory_discrepancy_history_returns_resolved_entries(inventory_service):
    inventory_service.subscription_tier = 'full'
    persisted = SimpleNamespace(
        discrepancy_id=9,
        alert_id=42,
        message='Inventory deduction failed for olive oil.',
        severity='urgent',
        status='Resolved',
        is_acknowledged=True,
        date_created=datetime(2026, 4, 2, 8, 0, 0),
        date_resolved=datetime(2026, 4, 2, 9, 15, 0),
        item_kind='ingredient',
        ingredient_id=101,
        batch_recipe_id=None,
        item_name='Olive Oil',
        unit='oz',
        required_quantity=12.5,
        available_quantity=4.0,
        current_quantity_on_hand=15.0,
        shortfall_quantity=0,
        reference_type='eod_sales',
        reference_id=20260402,
        attempted_day=datetime(2026, 4, 2).date(),
    )
    inventory_service.discrepancy_repo.get_history.return_value = [persisted]

    result = await inventory_service.get_inventory_discrepancy_history(
        start_date=datetime(2026, 4, 1).date(),
        end_date=datetime(2026, 4, 3).date(),
    )

    assert result == [
        {
            'discrepancy_id': 9,
            'alert_id': 42,
            'event_type': 'discrepancy_resolved',
            'status': 'Resolved',
            'is_acknowledged': True,
            'severity': 'urgent',
            'item_kind': 'ingredient',
            'ingredient_id': 101,
            'batch_recipe_id': None,
            'item_name': 'Olive Oil',
            'unit': 'oz',
            'message': 'Inventory deduction failed for olive oil.',
            'required_quantity': 12.5,
            'available_quantity': 4.0,
            'current_quantity_on_hand': 15.0,
            'shortfall_quantity': 0.0,
            'reference_type': 'eod_sales',
            'reference_id': 20260402,
            'attempted_day': '2026-04-02',
            'date_created': '2026-04-02T08:00:00',
            'date_resolved': '2026-04-02T09:15:00',
            'last_updated': '2026-04-02T09:15:00',
        }
    ]


@pytest.mark.asyncio
async def test_resolve_satisfied_deduction_alerts_clears_matching_alerts(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.alert_repo = AsyncMock()
    service.discrepancy_repo = AsyncMock()

    matching_alert = SimpleNamespace(
        alert_id=77,
        meta={'ingredient_id': 101, 'required_quantity': 12},
    )
    non_matching_alert = SimpleNamespace(
        alert_id=88,
        meta={'ingredient_id': 101, 'required_quantity': 30},
    )
    service.alert_repo.get_open_inventory_deduction_alerts.return_value = [
        matching_alert,
        non_matching_alert,
    ]
    service.alert_repo.get_by_id.return_value = SimpleNamespace(status='Active')
    service.alert_repo.update.return_value = object()
    service.discrepancy_repo.get_open_by_item.return_value = [
        SimpleNamespace(
            discrepancy_id=5,
            alert_id=77,
            required_quantity=12,
        )
    ]
    service.discrepancy_repo.update.return_value = object()

    resolved_count = await service._resolve_satisfied_deduction_alerts(
        ingredient_id=101,
        current_quantity_on_hand=12,
    )

    assert resolved_count == 1
    service.alert_repo.update.assert_awaited_once()
    service.discrepancy_repo.update.assert_awaited_once()


@pytest.mark.asyncio
async def test_resolve_manual_inventory_review_flags_clears_all_open_rows_for_item(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.alert_repo = AsyncMock()
    service.discrepancy_repo = AsyncMock()

    linked_alert_one = SimpleNamespace(alert_id=77, status='Active')
    linked_alert_two = SimpleNamespace(alert_id=78, status='Acknowledged')
    legacy_same_item = SimpleNamespace(alert_id=79, meta={'ingredient_id': 101})
    unrelated_alert = SimpleNamespace(alert_id=88, meta={'ingredient_id': 202})

    service.discrepancy_repo.get_open_by_item.return_value = [
        SimpleNamespace(discrepancy_id=5, alert_id=77, required_quantity=12, available_quantity=4),
        SimpleNamespace(discrepancy_id=6, alert_id=78, required_quantity=30, available_quantity=0),
    ]
    service.discrepancy_repo.update.return_value = object()
    service.alert_repo.get_by_id.side_effect = [linked_alert_one, linked_alert_two]
    service.alert_repo.get_open_inventory_deduction_alerts.return_value = [
        SimpleNamespace(alert_id=77, meta={'ingredient_id': 101}),
        SimpleNamespace(alert_id=78, meta={'ingredient_id': 101}),
        legacy_same_item,
        unrelated_alert,
    ]
    service.alert_repo.update.return_value = object()

    resolved_count = await service.resolve_manual_inventory_review_flags(
        ingredient_id=101,
        current_quantity_on_hand=Decimal('9'),
    )

    assert resolved_count == 3
    assert service.discrepancy_repo.update.await_count == 2
    discrepancy_updates = {
        call.args[0]: call.args[1] for call in service.discrepancy_repo.update.await_args_list
    }
    assert discrepancy_updates[5]['status'] == 'Resolved'
    assert discrepancy_updates[5]['current_quantity_on_hand'] == 9.0
    assert discrepancy_updates[5]['shortfall_quantity'] == 0.0
    assert 'available_quantity' not in discrepancy_updates[5]
    assert discrepancy_updates[6]['current_quantity_on_hand'] == 9.0
    assert discrepancy_updates[6]['shortfall_quantity'] == 0.0

    alert_updates = {
        call.args[0]: call.args[1] for call in service.alert_repo.update.await_args_list
    }
    assert set(alert_updates) == {77, 78, 79}
    assert 88 not in alert_updates
    assert alert_updates[79]['status'] == 'Resolved'


@pytest.mark.asyncio
async def test_set_inventory_current_stock_adds_delta_to_selected_lot(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.db.begin = MagicMock(return_value=_AsyncBegin())
    service.inventory_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.inventory_usage_log_repo = AsyncMock()
    service.inventory_stats = AsyncMock()
    service.alert_repo = AsyncMock()
    service.resolve_manual_inventory_review_flags = AsyncMock(return_value=1)
    service.inventory_stats.get_lot_remaining = AsyncMock(side_effect=[Decimal('4')])

    inventory_item = SimpleNamespace(inventory_id=12, ingredient_id=101, unit='lb')
    lot = SimpleNamespace(
        lot_id=500,
        ingredient_id=101,
        unit='lb',
        delivery_date=datetime(2026, 3, 30).date(),
        status=SimpleNamespace(value='available'),
    )
    service.inventory_repo.get_by_id.return_value = inventory_item
    service.inventory_lot_repo.get_inventory_lots_by_inventory_and_restaurant.return_value = [lot]

    result = await service.set_inventory_current_stock(
        inventory_id=12,
        counted_quantity=Decimal('7'),
        lot_id=500,
        reason='count_correction',
        notes='Shelf count after close',
    )

    assert result['success'] is True
    assert result['adjusted_quantity'] == 3.0
    assert result['previous_quantity_on_hand'] == 4.0
    assert result['current_quantity_on_hand'] == 7.0
    service.inventory_usage_log_repo.create.assert_awaited_once()
    created_payload = service.inventory_usage_log_repo.create.await_args.args[0]
    assert created_payload['lot_id'] == 500
    assert created_payload['usage_type'] == 'manual_adjustment'
    assert created_payload['used_quantity'] == Decimal('-3')
    service.inventory_repo.update.assert_awaited_once_with(12, {'quantity_on_hand': 7.0})


@pytest.mark.asyncio
async def test_handle_inventory_adjustment_normalizes_manual_addition_to_signed_adjustment(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.db.begin = MagicMock(return_value=_AsyncBegin())
    service.inventory_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.inventory_usage_log_repo = AsyncMock()
    service.inventory_stats = AsyncMock()
    service.alert_repo = AsyncMock()
    service.resolve_manual_inventory_review_flags = AsyncMock(return_value=0)
    service.inventory_stats.get_lot_remaining = AsyncMock(side_effect=[Decimal('4')])

    inventory_item = SimpleNamespace(inventory_id=12, ingredient_id=101, unit='lb')
    lot = SimpleNamespace(
        lot_id=500,
        ingredient_id=101,
        unit='lb',
        delivery_date=datetime(2026, 3, 30).date(),
        status=SimpleNamespace(value='available'),
    )
    service.inventory_repo.get_by_id.return_value = inventory_item
    service.inventory_lot_repo.get_inventory_lots_by_inventory_and_restaurant.return_value = [lot]

    result = await service.handle_inventory_adjustment(
        inventory_id=12,
        lot_id=500,
        adjustment_quantity=Decimal('3'),
        usage_type='manual_addition',
        notes='Manual add during review',
    )

    assert result['success'] is True
    assert result['current_quantity_on_hand'] == 7.0
    created_payload = service.inventory_usage_log_repo.create.await_args.args[0]
    assert created_payload['lot_id'] == 500
    assert created_payload['usage_type'] == 'manual_adjustment'
    assert created_payload['used_quantity'] == Decimal('-3')
    service.inventory_repo.update.assert_awaited_once_with(12, {'quantity_on_hand': 7.0})


@pytest.mark.asyncio
async def test_set_inventory_current_stock_removes_delta_fifo(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.db.begin = MagicMock(return_value=_AsyncBegin())
    service.inventory_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.inventory_usage_log_repo = AsyncMock()
    service.inventory_stats = AsyncMock()
    service.alert_repo = AsyncMock()
    service.resolve_manual_inventory_review_flags = AsyncMock(return_value=0)
    service.inventory_stats.get_lot_remaining = AsyncMock(side_effect=[Decimal('2'), Decimal('5')])

    inventory_item = SimpleNamespace(inventory_id=12, ingredient_id=101, unit='lb')
    older_lot = SimpleNamespace(
        lot_id=100,
        ingredient_id=101,
        unit='lb',
        delivery_date=datetime(2026, 3, 28).date(),
        status=SimpleNamespace(value='available'),
    )
    newer_lot = SimpleNamespace(
        lot_id=101,
        ingredient_id=101,
        unit='lb',
        delivery_date=datetime(2026, 3, 30).date(),
        status=SimpleNamespace(value='available'),
    )
    service.inventory_repo.get_by_id.return_value = inventory_item
    service.inventory_lot_repo.get_inventory_lots_by_inventory_and_restaurant.return_value = [newer_lot, older_lot]

    result = await service.set_inventory_current_stock(
        inventory_id=12,
        counted_quantity=Decimal('3'),
        reason='waste_not_logged',
    )

    assert result['success'] is True
    assert result['adjusted_quantity'] == 4.0
    assert result['previous_quantity_on_hand'] == 7.0
    assert result['current_quantity_on_hand'] == 3.0
    assert service.inventory_usage_log_repo.create.await_count == 2
    first_payload = service.inventory_usage_log_repo.create.await_args_list[0].args[0]
    second_payload = service.inventory_usage_log_repo.create.await_args_list[1].args[0]
    assert first_payload['lot_id'] == 100
    assert first_payload['used_quantity'] == Decimal('2')
    assert second_payload['lot_id'] == 101
    assert second_payload['used_quantity'] == Decimal('2')
    assert first_payload['usage_type'] == 'manual_adjustment'
    assert second_payload['usage_type'] == 'manual_adjustment'