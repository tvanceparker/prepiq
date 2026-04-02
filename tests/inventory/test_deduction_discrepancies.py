from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.inventory_service import InventoryService


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