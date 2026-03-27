import pytest
from io import BytesIO
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException, UploadFile

from app.schemas.dashboard_dto import EodSalesEntriesIn
from app.services.dashboard_service import DashboardService


@pytest.fixture
def dashboard_service(mock_db):
    service = DashboardService(mock_db, 1, 'full', employee_id=7)
    service.sales_repo = AsyncMock()
    service.menu_repo = AsyncMock()
    service.log_activity = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_upload_sales_entries_conflict_without_overwrite(dashboard_service):
    dashboard_service.sales_repo.sales_exist_for_date_and_channels.return_value = True

    payload = EodSalesEntriesIn.model_validate(
        {
            'sale_date': '2026-03-27',
            'entries': [
                {
                    'menu_item_id': 101,
                    'quantity_sold': 3,
                    'sales_channel': 'square',
                }
            ],
            'overwrite': False,
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        await dashboard_service.upload_sales_entries(payload)

    assert exc_info.value.status_code == 409
    dashboard_service.sales_repo.delete_sales_for_date_and_channels.assert_not_awaited()
    dashboard_service.sales_repo.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_upload_sales_entries_overwrite_deletes_only_present_channels(dashboard_service):
    dashboard_service.sales_repo.sales_exist_for_date_and_channels.return_value = False
    dashboard_service.menu_repo.get_by_id.return_value = MagicMock(restaurant_id=1)
    dashboard_service.sales_repo.create.return_value = MagicMock(
        sale_id=500,
        menu_item_id=101,
        quantity_sold=4,
        sales_channel='square',
        sale_timestamp=None,
    )

    payload = EodSalesEntriesIn.model_validate(
        {
            'sale_date': '2026-03-27',
            'entries': [
                {
                    'menu_item_id': 101,
                    'quantity_sold': 4,
                    'sales_channel': 'square',
                }
            ],
            'overwrite': True,
        }
    )

    result = await dashboard_service.upload_sales_entries(payload)

    dashboard_service.sales_repo.delete_sales_for_date_and_channels.assert_awaited_once()
    delete_args = dashboard_service.sales_repo.delete_sales_for_date_and_channels.await_args.args
    assert delete_args[0].isoformat() == '2026-03-27'
    assert delete_args[1] == ['square']
    dashboard_service.log_activity.assert_awaited_once()
    dashboard_service.sales_repo.create.assert_awaited_once()
    assert len(result) == 1
    assert result[0].menu_item_id == 101


@pytest.mark.asyncio
async def test_upload_sales_data_csv_conflict_without_overwrite(dashboard_service):
    dashboard_service.sales_repo.sales_exist_for_date_and_channels.return_value = True

    file = UploadFile(
        filename='sales.csv',
        file=BytesIO(
            b'sale_timestamp,menu_item_id,quantity_sold,sales_channel\n'
            b'2026-03-27T12:00:00,101,2,square\n'
        ),
    )

    with pytest.raises(HTTPException) as exc_info:
        await dashboard_service.upload_sales_data(file, overwrite=False)

    assert exc_info.value.status_code == 409
    dashboard_service.sales_repo.delete_sales_for_date_and_channels.assert_not_awaited()
    dashboard_service.sales_repo.create.assert_not_awaited()


@pytest.mark.asyncio
async def test_upload_sales_data_csv_overwrite_replaces_only_submitted_channels(dashboard_service):
    dashboard_service.sales_repo.create.return_value = MagicMock(
        sale_id=600,
        menu_item_id=101,
        quantity_sold=2,
        sales_channel='square',
        sale_timestamp=datetime(2026, 3, 27, 12, 0, 0),
    )

    file = UploadFile(
        filename='sales.csv',
        file=BytesIO(
            b'sale_timestamp,menu_item_id,quantity_sold,sales_channel\n'
            b'2026-03-27T12:00:00,101,2,square\n'
        ),
    )

    result = await dashboard_service.upload_sales_data(file, overwrite=True)

    dashboard_service.sales_repo.delete_sales_for_date_and_channels.assert_awaited_once()
    delete_args = dashboard_service.sales_repo.delete_sales_for_date_and_channels.await_args.args
    assert delete_args[0].isoformat() == '2026-03-27'
    assert delete_args[1] == ['square']
    dashboard_service.log_activity.assert_awaited_once()
    dashboard_service.sales_repo.create.assert_awaited_once()
    assert len(result) == 1
    assert result[0].sale_timestamp == '2026-03-27T12:00:00'


@pytest.mark.asyncio
async def test_check_sales_conflicts_returns_all_channel_counts_when_unfiltered(dashboard_service):
    dashboard_service.sales_repo.get_sales_channels_counts_for_date.return_value = [
        ('square', 4),
        (None, 2),
    ]

    result = await dashboard_service.check_sales_conflicts('2026-03-27')

    dashboard_service.sales_repo.sales_exist_for_date_and_channels.assert_not_called()
    dashboard_service.sales_repo.get_sales_channels_counts_for_date.assert_awaited_once()
    assert result == {
        'sale_date': '2026-03-27',
        'conflicts': {
            'square': 4,
            None: 2,
        },
    }


@pytest.mark.asyncio
async def test_check_sales_conflicts_filters_requested_channels_and_normalizes_null(dashboard_service):
    dashboard_service.sales_repo.sales_exist_for_date_and_channels.return_value = True
    dashboard_service.sales_repo.get_sales_channels_counts_for_date.return_value = [
        ('square', 4),
        ('ubereats', 3),
        (None, 2),
    ]

    result = await dashboard_service.check_sales_conflicts('2026-03-27', ['square', 'null'])

    dashboard_service.sales_repo.sales_exist_for_date_and_channels.assert_awaited_once()
    exists_args = dashboard_service.sales_repo.sales_exist_for_date_and_channels.await_args.args
    assert exists_args[0].isoformat() == '2026-03-27'
    assert exists_args[1] == ['square', None]
    assert result == {
        'sale_date': '2026-03-27',
        'conflicts': {
            'square': 4,
            None: 2,
        },
    }