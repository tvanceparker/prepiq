# prepiq3/tests/dashboard/test_dashboard_service.py

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard_dto import EodSalesEntriesIn, SalesEntryIn
from fastapi import UploadFile
from io import BytesIO
from datetime import datetime

@pytest.mark.asyncio
async def test_get_basic_overview():
    # Setup
    mock_db = MagicMock()
    restaurant_id = 1
    subscription_tier = 'basic'

    service = DashboardService(mock_db, restaurant_id, subscription_tier, employee_id=1)

    # Mock forecast breakdown data
    service.forecast_breakdown_repo.get_forecasts_by_date = AsyncMock(return_value=[
        MagicMock(menu_item_id=101, forecasted_quantity=100),
        MagicMock(menu_item_id=102, forecasted_quantity=200),
    ])

    # Fix: Use function instead of list for side_effect to prevent StopAsyncIteration
    def get_menu_item_by_id(menu_item_id):
        if menu_item_id == 101:
            mock_item = MagicMock(price=12.5, restaurant_id=1, is_active=True)
            mock_item.name = "Pizza"
            return mock_item
        elif menu_item_id == 102:
            mock_item = MagicMock(price=10.0, restaurant_id=1, is_active=True)
            mock_item.name = "Burger"
            return mock_item
        return None


    service.menu_repo.get_by_id = AsyncMock(side_effect=get_menu_item_by_id)

    # Mock daily accuracy data with numeric predicted/actual to avoid MagicMock math
    service.daily_accuracy_repo.get_by_date = AsyncMock(return_value=[
        MagicMock(predicted_quantity=110, actual_quantity=100),
        MagicMock(predicted_quantity=55, actual_quantity=50),
    ])

    # Run the method
    result = await service.get_daily_overview_data()
    result = result.model_dump()

    # Check overall structure
    assert "forecasted_sales_today" in result
    assert "top_5_items_today" in result
    assert "accuracy_yesterday" in result

    # Validate forecasted sales
    forecast = result["forecasted_sales_today"]
    assert forecast["forecasted_quantity"] == 300
    expected_revenue = float(round((100 * 12.5 + 200 * 10.0), 2))
    assert forecast["forecasted_revenue"] == expected_revenue

    # Validate top items
    top_items = result["top_5_items_today"]
    assert len(top_items) == 2
    assert top_items[0]["menu_item_id"] == 102
    assert top_items[0]["name"] == "Burger"
    assert top_items[1]["menu_item_id"] == 101
    assert top_items[1]["name"] == "Pizza"

    # Validate accuracy
    accuracy = result["accuracy_yesterday"]
    expected_accuracy = round(100 - ((15 / 150) * 100), 2)
    assert accuracy["accuracy_percent"] == expected_accuracy
    assert accuracy["note"] == ("Accurate" if expected_accuracy >= 85 else "Needs Improvement")

@pytest_asyncio.fixture
def sales_upload_service():
    db = MagicMock()
    restaurant_id = 123
    tier = "full"

    service = DashboardService(db, restaurant_id, tier, employee_id=1)
    service.sales_repo = MagicMock()
    service.sales_repo.sales_exist_for_date_and_channels = AsyncMock(return_value=False)
    service.sales_repo.delete_sales_for_date_and_channels = AsyncMock(return_value=0)
    service.sales_repo.create_many = AsyncMock(return_value=[])
    service.menu_repo = MagicMock()
    service.menu_repo.get_by_id = AsyncMock(return_value=None)
    service.menu_repo.get_by_name = AsyncMock(return_value=None)
    service.log_activity = AsyncMock()

    return service

@pytest.mark.asyncio
async def test_upload_sales_data_returns_structured_summary(sales_upload_service):
    service = sales_upload_service
    menu_item = MagicMock(menu_item_id=101, restaurant_id=123)
    uploaded_sale = MagicMock(
        sale_id=1,
        menu_item_id=101,
        quantity_sold=3,
        sales_channel="Delivery",
        sale_timestamp=datetime(2026, 4, 20, 12, 0, 0),
    )

    async def get_by_name(name: str):
        if name.lower() == "burger":
            return menu_item
        return None

    service.menu_repo.get_by_name = AsyncMock(side_effect=get_by_name)
    service.sales_repo.create_many = AsyncMock(return_value=[uploaded_sale])

    csv_content = (
        "menu_item_name,quantity_sold,sales_channel,sale_timestamp\n"
        "Burger,3,Delivery,2026-04-20T12:00:00\n"
        "Burger,3,Delivery,2026-04-20T12:00:00\n"
        "Missing,2,Delivery,2026-04-20T12:30:00\n"
        "Burger,,Delivery,2026-04-20T12:45:00\n"
    )
    file = UploadFile(filename="sales.csv", file=BytesIO(csv_content.encode("utf-8")))

    result = await service.upload_sales_data(file, overwrite=False)

    assert result.source == "file"
    assert result.inserted_rows == 1
    assert result.attempted_rows == 4
    assert result.skipped_rows == 3
    assert result.duplicate_rows == 1
    assert len(result.row_errors) == 1
    assert result.row_errors[0].code == "menu_item_not_found"
    assert result.data[0].menu_item_id == 101
    assert result.message == "Imported 1 of 4 sales rows. Skipped 3 rows."
    service.sales_repo.create_many.assert_awaited_once()
    service.sales_repo.delete_sales_for_date_and_channels.assert_not_awaited()
    service.log_activity.assert_awaited_once()

@pytest.mark.asyncio
async def test_upload_sales_entries_skips_overwrite_when_no_valid_rows(sales_upload_service):
    service = sales_upload_service
    payload = EodSalesEntriesIn(
        sale_date="2026-04-20",
        overwrite=True,
        entries=[SalesEntryIn(menu_item_id=999, quantity_sold=2)],
    )

    result = await service.upload_sales_entries(payload)

    assert result.source == "manual"
    assert result.inserted_rows == 0
    assert result.skipped_rows == 1
    assert len(result.row_errors) == 1
    assert result.row_errors[0].code == "menu_item_not_found"
    service.sales_repo.delete_sales_for_date_and_channels.assert_not_awaited()
    service.sales_repo.create_many.assert_awaited_once_with([])
    service.log_activity.assert_awaited_once()
