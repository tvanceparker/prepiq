# prepiq3/tests/dashboard/test_dashboard_service.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.dashboard_service import DashboardService

@pytest.mark.asyncio
async def test_get_basic_overview():
    # Setup
    mock_db = MagicMock()
    restaurant_id = 1
    subscription_tier = 'basic'

    service = DashboardService(mock_db, restaurant_id, subscription_tier)

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

    # Mock daily accuracy data
    service.daily_accuracy_repo.get_by_date = AsyncMock(return_value=[
        MagicMock(forecast_error=10, actual_quantity=100),
        MagicMock(forecast_error=5, actual_quantity=50),
    ])

    # Run the method
    result = await service.get_daily_overview_data()

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
