from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper


@pytest.fixture
def deduction_helper(mock_db):
    helper = InventoryDeductionHelper(mock_db, 1, 'full', employee_id=7)
    helper.discrepancy_repo = AsyncMock()
    helper.alert_repo = AsyncMock()
    helper.alerts_service = AsyncMock()
    return helper


@pytest.mark.asyncio
async def test_record_deduction_discrepancy_creates_new_record_and_alert(deduction_helper):
    deduction_helper.discrepancy_repo.get_open_by_reference_item.return_value = None
    deduction_helper.alerts_service.create_alert.return_value = {'alert_id': 42}

    await deduction_helper._record_deduction_discrepancy(
        message='Inventory deduction failed for olive oil.',
        item_kind='ingredient',
        meta={
            'ingredient_id': 101,
            'ingredient_name': 'Olive Oil',
            'required_quantity': 12.5,
            'available_quantity': 4,
            'current_quantity_on_hand': 4,
            'shortfall_quantity': 8.5,
            'unit': 'oz',
            'reference_type': 'eod_sales',
            'reference_id': 20260403,
            'attempted_day': '2026-04-03',
        },
    )

    deduction_helper.alerts_service.create_alert.assert_awaited_once()
    deduction_helper.discrepancy_repo.create.assert_awaited_once()
    created_payload = deduction_helper.discrepancy_repo.create.await_args.args[0]
    assert created_payload['alert_id'] == 42
    assert created_payload['item_kind'] == 'ingredient'
    assert created_payload['ingredient_id'] == 101
    assert created_payload['attempted_day'] == date(2026, 4, 3)


@pytest.mark.asyncio
async def test_record_deduction_discrepancy_reuses_existing_open_record(deduction_helper):
    deduction_helper.discrepancy_repo.get_open_by_reference_item.return_value = SimpleNamespace(
        discrepancy_id=7,
        alert_id=42,
    )
    deduction_helper.alert_repo.get_by_id.return_value = SimpleNamespace(status='Active')

    await deduction_helper._record_deduction_discrepancy(
        message='Inventory deduction failed for pico.',
        item_kind='batch',
        meta={
            'batch_recipe_id': 501,
            'batch_recipe_name': 'Pico de Gallo',
            'required_quantity': 5,
            'available_quantity': 0,
            'current_quantity_on_hand': 0,
            'shortfall_quantity': 5,
            'unit': 'qt',
            'reference_type': 'eod_sales',
            'reference_id': 20260403,
            'attempted_day': '2026-04-03',
        },
    )

    deduction_helper.alerts_service.create_alert.assert_not_called()
    deduction_helper.alert_repo.update.assert_awaited_once()
    deduction_helper.discrepancy_repo.update.assert_awaited_once()