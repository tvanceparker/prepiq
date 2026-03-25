import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime

from app.services.helpers.pos_integration_service import POSIntegrationService


class TestExternalPOSIngestService:
    @pytest.fixture
    def service(self, mock_db):
        service = POSIntegrationService(mock_db, 1, 'pro', 7)
        service.orders_repo = AsyncMock()
        service.orders_repo.pk_field = 'order_id'
        service.order_items_repo = AsyncMock()
        service.sales_repo = AsyncMock()
        service.menu_matcher = AsyncMock()
        service.inventory_helper = AsyncMock()
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        return service

    @pytest.mark.asyncio
    async def test_ingest_order_creates_completed_non_broadcast_import(self, service):
        service.orders_repo.get_by_external_id.return_value = None
        service.menu_matcher.get_or_match_menu_item_id.side_effect = [101, None]
        service.orders_repo.create.return_value = MagicMock(order_id=555)

        order_data = {
            'external_id': 'SQ-ORDER-1',
            'sales_channel': 'square',
            'subtotal': 22.00,
            'tax': 1.50,
            'discount': 0.0,
            'total': 23.50,
            'order_timestamp': '2026-03-24T10:15:00Z',
            'metadata': {'provider': 'square'},
            'items': [
                {
                    'external_item_id': 'sq-1',
                    'name': 'Burger',
                    'quantity': 2,
                    'unit_price': 11.00,
                },
                {
                    'external_item_id': 'sq-2',
                    'name': 'Mystery Special',
                    'quantity': 1,
                    'unit_price': 5.00,
                },
            ],
        }

        result = await service._ingest_order(order_data)

        assert result['status'] == 'imported'
        assert result['order_id'] == 555
        assert result['mapped_items'] == 1
        assert result['unmapped_items'] == 1
        assert result['unmapped_item_details'] == [
            {
                'external_item_id': 'sq-2',
                'external_item_name': 'Mystery Special',
            }
        ]

        service.orders_repo.create.assert_awaited_once()
        create_payload = service.orders_repo.create.await_args.args[0]
        assert create_payload['order_status'] == 'completed'
        assert create_payload['sales_channel'] == 'square'
        assert create_payload['order_metadata']['source'] == 'external_pos_import'
        assert create_payload['order_metadata']['provider'] == 'square'
        assert create_payload['order_metadata']['unmapped_item_count'] == 1

        service.order_items_repo.create.assert_awaited_once()
        order_item_payload = service.order_items_repo.create.await_args.args[0]
        assert order_item_payload['order_id'] == 555
        assert order_item_payload['menu_item_id'] == 101
        assert order_item_payload['recipe_snapshot']['source'] == 'external_pos_import'

        service.sales_repo.create.assert_awaited_once()
        service.orders_repo.update.assert_awaited_once_with(
            555,
            {'inventory_deduction_state': 'pending'},
        )

    @pytest.mark.asyncio
    async def test_ingest_order_skips_duplicate_external_order(self, service):
        service.orders_repo.get_by_external_id.return_value = MagicMock(order_id=44)

        result = await service._ingest_order(
            {
                'external_id': 'SQ-DUPE-1',
                'metadata': {'provider': 'square'},
                'items': [],
            }
        )

        assert result == {
            'status': 'duplicate',
            'external_order_id': 'SQ-DUPE-1',
            'mapped_items': 0,
            'unmapped_items': 0,
        }
        service.orders_repo.create.assert_not_awaited()
        service.order_items_repo.create.assert_not_awaited()
        service.sales_repo.create.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_get_import_health_returns_summary_unmapped_and_history(self, service):
        service._get_restaurant = AsyncMock(
            return_value=MagicMock(pos_provider='square')
        )
        service.pos_item_mappings_repo.get_unmapped_items = AsyncMock(
            return_value=[
                MagicMock(
                    mapping_id=9,
                    restaurant_id=1,
                    pos_provider='square',
                    external_item_id='sq-2',
                    external_item_name='Mystery Special',
                    menu_item_id=None,
                    confidence_score=0,
                    mapping_status='unmapped',
                    created_at=datetime(2026, 3, 24, 10, 0, 0),
                    updated_at=datetime(2026, 3, 24, 10, 5, 0),
                )
            ]
        )
        service.orders_repo.get_recent_external_import_orders = AsyncMock(
            return_value=[
                MagicMock(
                    order_id=77,
                    external_id='SQ-ORDER-1',
                    sales_channel='square',
                    order_timestamp=datetime(2026, 3, 24, 10, 15, 0),
                    total=23.50,
                    inventory_deduction_state='failed',
                    order_metadata={
                        'provider': 'square',
                        'imported_at': '2026-03-24T10:16:00',
                        'unmapped_item_count': 1,
                    },
                )
            ]
        )

        result = await service.get_import_health(limit=5)

        assert result['provider'] == 'square'
        assert result['summary'] == {
            'total_recent_imports': 1,
            'unmapped_items': 1,
            'pending_deductions': 0,
            'failed_deductions': 1,
            'last_import_at': '2026-03-24T10:16:00',
        }
        assert result['unmapped_items'][0]['external_item_id'] == 'sq-2'
        assert result['recent_imports'][0]['order_id'] == 77
        assert result['recent_imports'][0]['inventory_deduction_state'] == 'failed'
        service.pos_item_mappings_repo.get_unmapped_items.assert_awaited_once_with('square')
        service.orders_repo.get_recent_external_import_orders.assert_awaited_once_with(limit=5)