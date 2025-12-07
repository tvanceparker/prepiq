import pytest
import asyncio
from datetime import date
from unittest.mock import AsyncMock, patch
from collections import namedtuple
from app.services.sales_forecast_service import SalesForecastService

# Helper: Simple mock objects for repo rows
ForecastRow = namedtuple("ForecastRow", "forecast_date menu_item_id forecasted_quantity")
SaleRow = namedtuple("SaleRow", "sale_date menu_item_id quantity_sold")
MenuItem = namedtuple("MenuItem", "menu_item_id name")
AccuracyRow = namedtuple(
    "AccuracyRow",
    "forecast_date menu_item_id error_percentage forecast_error predicted_quantity actual_quantity forecast_period_start forecast_period_end"
)

@pytest.mark.asyncio
async def test_get_daily_accuracy_chart_data():
    # Setup
    db = AsyncMock()
    service = SalesForecastService(db, restaurant_id=1, subscription_tier="basic", employee_id=1)

    # Mock repo return values
    mock_rows = [
        AccuracyRow(forecast_date=date(2025,6,10), menu_item_id=201, error_percentage=10, forecast_error=5,
                    predicted_quantity=None, actual_quantity=None, forecast_period_start=None, forecast_period_end=None),
        AccuracyRow(forecast_date=date(2025,6,11), menu_item_id=202, error_percentage=20, forecast_error=10,
                    predicted_quantity=None, actual_quantity=None, forecast_period_start=None, forecast_period_end=None),
    ]
    service.daily_forecast_accuracy_repo.get_latest_by_date_range = AsyncMock(return_value=mock_rows)
    service.menu_repo.get_by_ids = AsyncMock(return_value=[
        MenuItem(menu_item_id=201, name="Burger"),
        MenuItem(menu_item_id=202, name="Fries"),
    ])

    # Call
    results = await service.get_daily_accuracy_chart_data(date(2025,6,10), date(2025,6,11))

    # Assert
    assert len(results) == 2
    assert results[0]["menu_item_name"] == "Burger"
    assert results[1]["error_percentage"] == 20

@pytest.mark.asyncio
async def test_get_forecast_accuracy_table():
    db = AsyncMock()
    service = SalesForecastService(db, restaurant_id=1, subscription_tier="basic", employee_id=1)

    # Mock summary rows
    summary_rows = [
        AccuracyRow(
            forecast_date=None, menu_item_id=201, error_percentage=15, forecast_error=7,
            predicted_quantity=50, actual_quantity=43,
            forecast_period_start=date(2025,6,1), forecast_period_end=date(2025,6,10)
        )
    ]

    # Mock daily rows
    daily_rows = [
        AccuracyRow(
            forecast_date=date(2025,6,10), menu_item_id=201, error_percentage=10, forecast_error=5,
            predicted_quantity=20, actual_quantity=18,
            forecast_period_start=None, forecast_period_end=None
        ),
        AccuracyRow(
            forecast_date=date(2025,6,11), menu_item_id=202, error_percentage=25, forecast_error=12,
            predicted_quantity=30, actual_quantity=22,
            forecast_period_start=None, forecast_period_end=None
        ),
    ]

    service.forecast_accuracy_repo.get_overlapping_date_range = AsyncMock(return_value=summary_rows)
    service.daily_forecast_accuracy_repo.get_latest_by_date_range = AsyncMock(return_value=daily_rows)
    service.menu_repo.get_by_ids = AsyncMock(return_value=[
        MenuItem(menu_item_id=201, name="Burger"),
        MenuItem(menu_item_id=202, name="Fries"),
    ])

    results = await service.get_forecast_accuracy_table(date(2025,6,10), date(2025,6,11))

    assert len(results) == 3
    assert any(r["source"] == "summary" for r in results)
    assert any(r["source"] == "daily" for r in results)
    assert results[0]["menu_item_name"] == "Burger"
    assert results[-1]["menu_item_name"] == "Fries"

@pytest.mark.asyncio
async def test_compute_accuracy_from_raw_data():
    db = AsyncMock()
    service = SalesForecastService(db, restaurant_id=1, subscription_tier="basic", employee_id=1)

    # Mock forecasts (forecast_date, menu_item_id, forecasted_quantity)
    forecasts = [
        ForecastRow(forecast_date=date(2025,6,10), menu_item_id=201, forecasted_quantity=20),
        ForecastRow(forecast_date=date(2025,6,10), menu_item_id=202, forecasted_quantity=15),
    ]

    # Mock sales (sale_date, menu_item_id, quantity_sold)
    sales = [
        SaleRow(sale_date=date(2025,6,10), menu_item_id=201, quantity_sold=18),
        SaleRow(sale_date=date(2025,6,10), menu_item_id=203, quantity_sold=5),
    ]

    service.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(return_value=forecasts)
    service.sale_repo.get_sales_grouped_by_day = AsyncMock(return_value=sales)
    service.menu_repo.get_by_ids = AsyncMock(return_value=[
        MenuItem(menu_item_id=201, name="Burger"),
        MenuItem(menu_item_id=202, name="Fries"),
        MenuItem(menu_item_id=203, name="Salad"),
    ])

    results = await service.compute_accuracy_from_raw_data(date(2025,6,10), date(2025,6,10))

    # There should be keys for menu_item_id 201, 202, and 203 across the forecast and sales maps
    assert any(r["menu_item_id"] == 201 for r in results)
    assert any(r["menu_item_id"] == 202 for r in results)
    assert any(r["menu_item_id"] == 203 for r in results)

    # Check error calculations for item 201 (forecast 20, actual 18)
    item_201 = next(r for r in results if r["menu_item_id"] == 201)
    assert item_201["error"] == 2
    assert abs(item_201["error_percentage"] - (2/18*100)) < 0.0001

    # For item 202 (forecast 15, actual 0)
    item_202 = next(r for r in results if r["menu_item_id"] == 202)
    assert item_202["actual"] == 0
    assert item_202["error_percentage"] is None

    # For item 203 (forecast 0, actual 5)
    item_203 = next(r for r in results if r["menu_item_id"] == 203)
    assert item_203["forecasted"] == 0
    assert item_203["actual"] == 5

