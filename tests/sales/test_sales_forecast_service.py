import pytest
import asyncio
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.sales_forecast_service import SalesForecastService

@pytest.mark.asyncio
class TestSalesForecastService:
    @pytest.fixture
    def service(self):
        db = AsyncMock()
        restaurant_id = 123
        tier = "basic"
        svc = SalesForecastService(db, restaurant_id, tier, employee_id=1)

        # Mock repositories as AsyncMock objects on the service instance
        svc.forecast_breakdown_repo = AsyncMock()
        svc.menu_repo = AsyncMock()

        return svc

    async def test_get_upcoming_forecast_table_basic(self, service):
        # Multiple forecast rows for the same item on the same day
        forecast_rows = [
            MagicMock(menu_item_id=1, forecast_date=date(2025, 6, 1), forecasted_quantity=10),
            MagicMock(menu_item_id=1, forecast_date=date(2025, 6, 1), forecasted_quantity=15),
            MagicMock(menu_item_id=2, forecast_date=date(2025, 6, 1), forecasted_quantity=5),
        ]
        service.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(return_value=forecast_rows)

        pizza_mock = MagicMock(menu_item_id=1, is_active=True)
        pizza_mock.name = "Pizza"
        burger_mock = MagicMock(menu_item_id=2, is_active=True)
        burger_mock.name = "Burger"
        menu_items = [pizza_mock, burger_mock]

        service.menu_repo.get_by_ids = AsyncMock(return_value=menu_items)

        results = await service.get_upcoming_forecast_table_basic(date(2025, 6, 1), date(2025, 6, 2))

        expected = [
            {"date": date(2025, 6, 1), "menu_item_id": 1, "menu_item_name": "Pizza", "forecasted_quantity": 25},
            {"date": date(2025, 6, 1), "menu_item_id": 2, "menu_item_name": "Burger", "forecasted_quantity": 5},
        ]
        assert sorted(results, key=lambda x: x["menu_item_id"]) == expected

    async def test_get_upcoming_forecast_totals_basic_per_day(self, service):
        forecast_rows = [
            MagicMock(menu_item_id=1, forecast_date=date(2025,6,1), forecasted_quantity=10),
            MagicMock(menu_item_id=1, forecast_date=date(2025,6,2), forecasted_quantity=5),
        ]
        service.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(return_value=forecast_rows)

        item_mock = MagicMock(price=Decimal("10.00"), is_active=True)
        service.menu_repo.get_by_id = AsyncMock(return_value=item_mock)

        results = await service.get_upcoming_forecast_totals_basic(date(2025,6,1), date(2025,6,2), mode="per_day")

        expected = [
            {"date": date(2025,6,1), "forecasted_quantity": 10, "forecasted_revenue": 100.0},
            {"date": date(2025,6,2), "forecasted_quantity": 5, "forecasted_revenue": 50.0},
        ]
        assert results == expected

    async def test_get_upcoming_forecast_totals_basic_total(self, service):
        forecast_rows = [
            MagicMock(menu_item_id=1, forecast_date=date(2025,6,1), forecasted_quantity=10),
            MagicMock(menu_item_id=1, forecast_date=date(2025,6,2), forecasted_quantity=5),
        ]
        service.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(return_value=forecast_rows)

        item_mock = MagicMock(price=Decimal("10.00"), is_active=True)
        service.menu_repo.get_by_id = AsyncMock(return_value=item_mock)

        result = await service.get_upcoming_forecast_totals_basic(date(2025,6,1), date(2025,6,2), mode="total")

        expected = {
            "forecasted_quantity": 15,
            "forecasted_revenue": 150.0,
        }
        assert result == expected

    async def test_get_top_forecasted_items_basic(self, service):
        forecast_rows = [
            MagicMock(menu_item_id=1, forecasted_quantity=10),
            MagicMock(menu_item_id=2, forecasted_quantity=20),
            MagicMock(menu_item_id=3, forecasted_quantity=5),
            MagicMock(menu_item_id=2, forecasted_quantity=5),
        ]
        service.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(return_value=forecast_rows)

        # Prepare menu item mocks with explicit 'name' and 'is_active'
        pizza = MagicMock(menu_item_id=1, is_active=True)
        pizza.name = "Pizza"
        burger = MagicMock(menu_item_id=2, is_active=True)
        burger.name = "Burger"
        salad = MagicMock(menu_item_id=3, is_active=True)
        salad.name = "Salad"

        menu_items_map = {
            1: pizza,
            2: burger,
            3: salad,
        }

        async def get_by_id_side_effect(menu_item_id):
            return menu_items_map.get(menu_item_id)

        service.menu_repo.get_by_id = AsyncMock(side_effect=get_by_id_side_effect)

        results = await service.get_top_forecasted_items_basic(date(2025,6,1), date(2025,6,3), limit=2)

        expected = [
            {"menu_item_id": 2, "name": "Burger", "forecasted_quantity": 25},
            {"menu_item_id": 1, "name": "Pizza", "forecasted_quantity": 10},
        ]

        assert results == expected
