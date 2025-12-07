import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timedelta, date
from decimal import Decimal
from collections import namedtuple

from app.services.sales_forecast_service import SalesForecastService

MenuItem = namedtuple("MenuItem", ["menu_item_id", "name", "price", "category", "is_active"])

@pytest.mark.asyncio
class TestSalesPatternsService:

    @pytest.fixture
    def mock_repos(self):
        sale_repo = AsyncMock()
        menu_repo = AsyncMock()
        return sale_repo, menu_repo

    @pytest.fixture
    def service(self, mock_repos):
        sale_repo, menu_repo = mock_repos
        service = SalesForecastService(db=None, restaurant_id=1, subscription_tier="pro", employee_id=1)
        service.sale_repo = sale_repo
        service.menu_repo = menu_repo
        return service

    def generate_sales_data(self):
        base_datetime = datetime.combine(date.today(), datetime.min.time())
        return [
            MagicMock(menu_item_id=1, quantity_sold=2, sale_timestamp=base_datetime, sales_channel="dine-in"),
            MagicMock(menu_item_id=2, quantity_sold=1, sale_timestamp=base_datetime - timedelta(days=1), sales_channel="online"),
        ]

    def generate_menu_data(self):
        return [
            MenuItem(menu_item_id=1, name="Burger", price=Decimal("10.00"), category="Main", is_active=True),
            MenuItem(menu_item_id=2, name="Fries", price=Decimal("5.00"), category="Sides", is_active=True),
        ]

    async def test_sales_over_time_by_item(self, service, mock_repos):
        sales = self.generate_sales_data()
        menu_items = self.generate_menu_data()

        mock_repos[0].get_sales_between_dates.return_value = sales
        mock_repos[1].get_by_ids.return_value = menu_items

        # Use a date range covering both sales timestamps
        start_date = date.today() - timedelta(days=1)
        end_date = date.today()

        result = await service.get_sales_over_time_by_item(start_date, end_date, by_revenue=True)

        assert isinstance(result, list)
        assert all("value" in row for row in result)
        assert any(row["menu_item_name"] == "Burger" for row in result)

    async def test_sales_heatmap_data(self, service, mock_repos):
        sales = self.generate_sales_data()
        menu_items = self.generate_menu_data()

        mock_repos[0].get_sales_between_dates.return_value = sales
        mock_repos[1].get_by_ids.return_value = menu_items

        start_date = date.today() - timedelta(days=1)
        end_date = date.today()

        result = await service.get_sales_heatmap_data(start_date, end_date, by_revenue=True)

        assert "overall" in result
        assert "by_menu_item" in result
        assert "by_category" in result
        assert len(result["overall"]) > 0
        assert all("value" in item for item in result["overall"])

    async def test_weekday_sales_avg(self, service, mock_repos):
        sales = self.generate_sales_data()
        menu_items = self.generate_menu_data()

        mock_repos[0].get_sales_between_dates.return_value = sales
        mock_repos[1].get_by_ids.return_value = menu_items

        start_date = date.today() - timedelta(days=1)
        end_date = date.today()

        result = await service.get_weekday_sales_avg(start_date, end_date, by_revenue=True)

        assert isinstance(result, list)
        assert len(result) == 7
        assert all("weekday" in r and "average_value" in r for r in result)

    async def test_sales_channel_breakdown(self, service, mock_repos):
        sales = self.generate_sales_data()
        menu_items = self.generate_menu_data()

        mock_repos[0].get_sales_between_dates.return_value = sales
        mock_repos[1].get_by_ids.return_value = menu_items

        start_date = date.today() - timedelta(days=1)
        end_date = date.today()

        result = await service.get_sales_channel_breakdown(start_date, end_date, by_revenue=True)

        assert isinstance(result, list)
        assert all("sales_channel" in r and "value" in r for r in result)
        # Percent of total should not exceed 100%
        assert sum(r["percent_of_total"] for r in result) <= 100.0
