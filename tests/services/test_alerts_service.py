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
        'description': 'Tomatoes is at 4, below the reorder point of 12. Review reorder suggestions soon.',
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