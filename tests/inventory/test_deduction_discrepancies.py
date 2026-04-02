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
async def test_resolve_satisfied_deduction_alerts_clears_matching_alerts(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.alert_repo = AsyncMock()

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
    service.alert_repo.update.return_value = object()

    resolved_count = await service._resolve_satisfied_deduction_alerts(
        ingredient_id=101,
        current_quantity_on_hand=12,
    )

    assert resolved_count == 1
    service.alert_repo.update.assert_awaited_once()


@pytest.mark.asyncio
async def test_set_inventory_current_stock_adds_delta_to_selected_lot(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.db.begin = MagicMock(return_value=_AsyncBegin())
    service.inventory_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.inventory_usage_log_repo = AsyncMock()
    service.alert_repo = AsyncMock()
    service._resolve_satisfied_deduction_alerts = AsyncMock(return_value=1)
    service._compute_lot_remaining = AsyncMock(side_effect=[Decimal('4')])

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
    assert created_payload['usage_type'] == 'manual_addition'
    assert created_payload['used_quantity'] == Decimal('3')
    service.inventory_repo.update.assert_awaited_once_with(12, {'quantity_on_hand': 7.0})


@pytest.mark.asyncio
async def test_set_inventory_current_stock_removes_delta_fifo(mock_db):
    service = InventoryService(mock_db, 1, 'full', employee_id=7)
    service.db.begin = MagicMock(return_value=_AsyncBegin())
    service.inventory_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    service.inventory_usage_log_repo = AsyncMock()
    service.alert_repo = AsyncMock()
    service._resolve_satisfied_deduction_alerts = AsyncMock(return_value=0)
    service._compute_lot_remaining = AsyncMock(side_effect=[Decimal('2'), Decimal('5')])

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