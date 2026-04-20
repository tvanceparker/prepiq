from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.integrations.pos.square_provider import SquareProvider
from app.services.helpers.pos_integration_service import POSIntegrationService


def build_service(mock_db):
    return POSIntegrationService(mock_db, 1, 'full', employee_id=7)


@pytest.mark.asyncio
async def test_ingest_order_returns_duplicate_when_external_id_exists(mock_db):
    service = build_service(mock_db)
    service.orders_repo.get_by_external_id = AsyncMock(
        return_value=SimpleNamespace(order_id=55, inventory_deduction_state='succeeded')
    )

    result = await service._ingest_order(
        {
            'external_id': 'SQ-ORDER-1',
            'metadata': {'provider': 'square'},
            'items': [],
        }
    )

    assert result['status'] == 'duplicate'
    assert result['order_id'] == 55
    assert result['reason'] == 'already_processed'
    service.orders_repo.get_by_external_id.assert_awaited_once_with('SQ-ORDER-1')


@pytest.mark.asyncio
async def test_sync_orders_returns_partial_summary_with_duplicates_and_failures(mock_db):
    service = build_service(mock_db)
    start_date = datetime(2026, 4, 20, 9, 0, 0)
    end_date = datetime(2026, 4, 20, 17, 0, 0)

    service._get_restaurant = AsyncMock(
        return_value=SimpleNamespace(
            pos_connected=True,
            pos_provider='square',
            pos_last_sync=None,
        )
    )
    service.restaurant_repo.update = AsyncMock()

    provider = MagicMock()
    provider.fetch_orders_with_retry = AsyncMock(
        return_value={
            'orders': [{'id': 'sq-1'}, {'id': 'sq-2'}, {'id': 'sq-3'}],
            'cursor': None,
        }
    )
    provider.transform_order = MagicMock(
        side_effect=[
            {'external_id': 'sq-1', 'items': []},
            {'external_id': 'sq-2', 'items': []},
            {'external_id': 'sq-3', 'items': []},
        ]
    )
    service._get_provider_instance = MagicMock(return_value=provider)
    service._ingest_order = AsyncMock(
        side_effect=[
            {
                'status': 'ingested',
                'external_id': 'sq-1',
                'items_synced': 2,
                'unmapped_items': [],
                'deduction_state': 'succeeded',
            },
            {
                'status': 'duplicate',
                'external_id': 'sq-2',
                'items_synced': 0,
                'unmapped_items': [],
                'deduction_state': 'succeeded',
                'reason': 'already_processed',
            },
            {
                'status': 'failed',
                'external_id': 'sq-3',
                'items_synced': 0,
                'unmapped_items': ['Fries (item-3)'],
                'deduction_state': None,
                'reason': 'no_mappable_items',
            },
        ]
    )

    summary = await service.sync_orders(start_date, end_date, max_pages=1)

    assert summary.status == 'partial'
    assert summary.total_orders_fetched == 3
    assert summary.total_orders_ingested == 1
    assert summary.total_orders_failed == 1
    assert summary.total_items_synced == 2
    assert summary.duplicate_orders == 1
    assert summary.unmapped_items == ['Fries (item-3)']
    assert summary.failed_orders[0].external_id == 'sq-3'
    assert 'Ignored 1 duplicate order' in summary.message
    service.restaurant_repo.update.assert_awaited_once()


@pytest.mark.asyncio
async def test_handle_webhook_event_marks_duplicate_order_processed(mock_db):
    service = build_service(mock_db)
    service._get_restaurant = AsyncMock(return_value=SimpleNamespace(pos_provider='square'))

    provider = MagicMock()
    provider.verify_webhook_signature.return_value = True
    provider.parse_webhook_event.return_value = {
        'event_type': 'order.created',
        'object': {'id': 'sq-1'},
    }
    provider.transform_order.return_value = {
        'external_id': 'sq-1',
        'metadata': {'provider': 'square'},
    }

    service._get_provider_instance = MagicMock(return_value=provider)
    service._ingest_order = AsyncMock(
        return_value={
            'status': 'duplicate',
            'external_id': 'sq-1',
            'reason': 'already_processed',
        }
    )

    result = await service.handle_webhook_event(
        provider='square',
        payload={'type': 'order.created'},
        signature='sig',
        raw_body=b'{}',
    )

    assert result['status'] == 'processed'
    assert result['action'] == 'duplicate_ignored'
    assert result['ingest_result']['external_id'] == 'sq-1'


@pytest.mark.asyncio
async def test_square_provider_fetch_orders_with_retry_retries_rate_limit(mock_db):
    provider = SquareProvider(
        access_token='token',
        refresh_token='refresh',
        location_id='loc-1',
        merchant_id='merchant-1',
    )
    request = httpx.Request('POST', 'https://example.com/orders/search')
    response = httpx.Response(429, request=request)
    rate_limit_error = httpx.HTTPStatusError('rate limited', request=request, response=response)
    provider.fetch_orders = AsyncMock(side_effect=[rate_limit_error, {'orders': [], 'cursor': None}])

    with patch('app.integrations.pos.square_provider.asyncio.sleep', new=AsyncMock()) as sleep_mock:
        result = await provider.fetch_orders_with_retry(
            datetime(2026, 4, 20, 9, 0, 0),
            datetime(2026, 4, 20, 10, 0, 0),
            max_retries=2,
            backoff_factor=1,
        )

    assert result == {'orders': [], 'cursor': None}
    assert provider.fetch_orders.await_count == 2
    sleep_mock.assert_awaited_once()