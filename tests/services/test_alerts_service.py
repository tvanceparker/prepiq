from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.alerts_service import AlertsService


def build_service(mock_db):
    return AlertsService(mock_db, 1, 'full', employee_id=7)


def test_normalize_alert_replaces_inventory_message_with_operator_description(mock_db):
    service = build_service(mock_db)

    normalized = service._normalize_alert(
        {
            'alert_type': 'Inventory:DeductionFailed',
            'message': 'Inventory deduction failed for olive oil.',
            'severity': 'critical',
            'meta': {
                'ingredient_name': 'Olive Oil',
                'required_quantity': 132,
                'available_quantity': 96,
                'unit': 'oz',
            },
        }
    )

    assert normalized['severity'] == 'urgent'
    assert normalized['title'] == 'Inventory shortfall: Olive Oil'
    assert normalized['action_label'] == 'Review inventory'
    assert normalized['description'] == (
        'Olive Oil needed 132 oz, but only 96 oz was available. '
        'Review inventory and confirm the counted stock.'
    )
    assert normalized['message'] == normalized['description']


def test_build_operator_copy_for_low_stock_uses_inventory_context(mock_db):
    service = build_service(mock_db)

    copy = service._build_operator_copy(
        {
            'alert_type': 'LowStock',
            'message': "Low stock alert: 'Tomatoes' stock is at 4 which is below the reorder point (12).",
            'meta': {
                'ingredient_name': 'Tomatoes',
                'current_stock': 4,
                'reorder_point': 12,
            },
        }
    )

    assert copy == {
        'title': 'Low stock warning',
        'action_label': 'Review reorder',
        'description': 'Tomatoes is at 4, below the reorder point of 12. Review reorder suggestions before the shortage reaches service impact.',
    }


def test_build_operator_copy_preserves_unknown_alert_message(mock_db):
    service = build_service(mock_db)

    copy = service._build_operator_copy(
        {
            'alert_type': 'Custom:SystemAlert',
            'message': 'Background sync failed on worker 3.',
            'meta': {},
        }
    )

    assert copy == {
        'title': 'Custom Systemalert',
        'action_label': 'Review details',
        'description': 'Background sync failed on worker 3.',
    }


@pytest.mark.asyncio
async def test_fix_alert_inventory_deduction_failed_uses_shared_manual_clear(mock_db):
    service = build_service(mock_db)
    service.alert_repo = AsyncMock()
    service.inventory_repo = AsyncMock()

    service.alert_repo.get_by_id.return_value = SimpleNamespace(
        alert_id=42,
        alert_type='Inventory:DeductionFailed',
        meta={
            'ingredient_id': 101,
            'required_quantity': 12,
            'available_quantity': 4,
            'unit': 'oz',
        },
    )
    service.inventory_repo.get_inventory_by_ingredient.return_value = SimpleNamespace(inventory_id=12)
    service.alert_repo.resolve = AsyncMock(return_value=True)

    inventory_service = AsyncMock()
    inventory_service.resolve_manual_inventory_review_flags = AsyncMock(return_value=3)
    service._build_inventory_service = MagicMock(return_value=inventory_service)

    fixed = await service.fix_alert(42, {'target_quantity_on_hand': 9})

    assert fixed is True
    service.inventory_repo.update.assert_awaited_once_with(12, {'quantity_on_hand': 9.0})
    inventory_service.resolve_manual_inventory_review_flags.assert_awaited_once_with(
        ingredient_id=101,
        batch_recipe_id=None,
        current_quantity_on_hand=Decimal('9.0'),
    )
    service.alert_repo.resolve.assert_awaited_once_with(42)