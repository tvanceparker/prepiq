"""
Unit tests for InventoryStatsService.

Tests each statistical calculation method in isolation.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, patch

from app.services.inventory_stats_service import InventoryStatsService


class TestInventoryStatsServiceUnit:
    """Unit tests for individual InventoryStatsService methods."""

    @pytest.mark.asyncio
    async def test_get_average_daily_usage_with_logs(
        self, mock_db_session, restaurant_id
    ):
        """Test average daily usage calculation from usage logs."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        # Mock usage log data (14+ days)
        service.inventory_usage_log_repo.get_daily_usage = AsyncMock(
            return_value=[
                (date.today() - timedelta(days=i), Decimal("2.50"))
                for i in range(20)
            ]
        )
        
        result = await service.get_average_daily_usage(ingredient_id=1001, days=30)
        
        assert result == Decimal("2.50")
        service.inventory_usage_log_repo.get_daily_usage.assert_called_once_with(1001, 30)

    @pytest.mark.asyncio
    async def test_get_average_daily_usage_fallback_to_sales(
        self, mock_db_session, restaurant_id
    ):
        """Test fallback to sales-derived usage when insufficient logs."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        # Mock insufficient usage log data
        service.inventory_usage_log_repo.get_daily_usage = AsyncMock(return_value=[])
        
        # Mock forecasting engine fallback
        service.forecasting_engine.derive_ingredient_usage_from_sales = AsyncMock(
            return_value={
                1001: {
                    date.today() - timedelta(days=i): Decimal("3.00")
                    for i in range(30)
                }
            }
        )
        
        result = await service.get_average_daily_usage(ingredient_id=1001, days=30)
        
        assert result == Decimal("3.00")
        service.forecasting_engine.derive_ingredient_usage_from_sales.assert_called_once_with(30)

    @pytest.mark.asyncio
    async def test_get_average_daily_usage_no_data(
        self, mock_db_session, restaurant_id
    ):
        """Test zero return when no usage data exists."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.inventory_usage_log_repo.get_daily_usage = AsyncMock(return_value=[])
        service.forecasting_engine.derive_ingredient_usage_from_sales = AsyncMock(
            return_value={}
        )
        
        result = await service.get_average_daily_usage(ingredient_id=1001, days=30)
        
        assert result == Decimal("0")

    @pytest.mark.asyncio
    async def test_get_std_dev_usage_with_logs(
        self, mock_db_session, restaurant_id
    ):
        """Test standard deviation calculation from usage logs."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        # Mock usage data with variance
        service.inventory_usage_log_repo.get_daily_usage = AsyncMock(
            return_value=[
                (date.today() - timedelta(days=0), Decimal("2.00")),
                (date.today() - timedelta(days=1), Decimal("3.00")),
                (date.today() - timedelta(days=2), Decimal("2.50")),
                (date.today() - timedelta(days=3), Decimal("2.75")),
                (date.today() - timedelta(days=4), Decimal("2.25")),
                (date.today() - timedelta(days=5), Decimal("3.25")),
                (date.today() - timedelta(days=6), Decimal("2.10")),
                (date.today() - timedelta(days=7), Decimal("2.90")),
                (date.today() - timedelta(days=8), Decimal("2.40")),
                (date.today() - timedelta(days=9), Decimal("2.60")),
                (date.today() - timedelta(days=10), Decimal("2.80")),
                (date.today() - timedelta(days=11), Decimal("2.30")),
                (date.today() - timedelta(days=12), Decimal("2.70")),
                (date.today() - timedelta(days=13), Decimal("2.50")),
                (date.today() - timedelta(days=14), Decimal("2.65")),
            ]
        )
        
        result = await service.get_std_dev_usage(ingredient_id=1001, days=30)
        
        assert isinstance(result, Decimal)
        assert result > Decimal("0")

    @pytest.mark.asyncio
    async def test_get_std_dev_usage_insufficient_samples(
        self, mock_db_session, restaurant_id
    ):
        """Test std dev returns zero with insufficient samples."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.inventory_usage_log_repo.get_daily_usage = AsyncMock(
            return_value=[(date.today(), Decimal("2.00"))]
        )
        service.forecasting_engine.derive_ingredient_usage_from_sales = AsyncMock(
            return_value={}
        )
        
        result = await service.get_std_dev_usage(ingredient_id=1001, days=30)
        
        assert result == Decimal("0")

    @pytest.mark.asyncio
    async def test_get_current_inventory(
        self, mock_db_session, restaurant_id, sample_inventory
    ):
        """Test current inventory retrieval."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=sample_inventory[0]
        )
        
        qty, unit = await service.get_current_inventory(ingredient_id=1001)
        
        assert qty == Decimal("50.00")
        assert unit == "lb"

    @pytest.mark.asyncio
    async def test_get_current_inventory_missing(
        self, mock_db_session, restaurant_id
    ):
        """Test current inventory when ingredient not found."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=None)
        
        result = await service.get_current_inventory(9999)
        
        # Returns (0.00, '') when inventory is missing
        assert result == (Decimal("0.00"), "")

    @pytest.mark.asyncio
    async def test_get_lead_time_days(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        """Test lead time retrieval from supplier."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier = AsyncMock(
            return_value=sample_suppliers[0]
        )
        
        result = await service.get_lead_time_days(ingredient_id=1001)
        
        assert result == 3

    @pytest.mark.asyncio
    async def test_get_lead_time_days_default(
        self, mock_db_session, restaurant_id
    ):
        """Test default lead time when no supplier found."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier = AsyncMock(
            return_value=None
        )
        
        result = await service.get_lead_time_days(ingredient_id=1001)
        
        assert result == 1

    @pytest.mark.asyncio
    async def test_get_moq(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        """Test minimum order quantity retrieval."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier = AsyncMock(
            return_value=sample_suppliers[0]
        )
        
        result = await service.get_moq(ingredient_id=1001)
        
        assert result == Decimal("10.00")

    @pytest.mark.asyncio
    async def test_get_moq_default(
        self, mock_db_session, restaurant_id
    ):
        """Test default MOQ when no supplier found."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier = AsyncMock(
            return_value=None
        )
        
        result = await service.get_moq(ingredient_id=1001)
        
        assert result == Decimal("1")

    @pytest.mark.asyncio
    async def test_get_max_stock_level(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test max stock level retrieval."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        ingredient = sample_ingredients[0]
        ingredient.max_stock_level = Decimal("100.00")
        service.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        
        result = await service.get_max_stock_level(ingredient_id=1001)
        
        assert result == Decimal("100.00")

    @pytest.mark.asyncio
    async def test_get_max_stock_level_undefined(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test max stock level when undefined."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        ingredient = sample_ingredients[0]
        ingredient.max_stock_level = None
        service.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        
        result = await service.get_max_stock_level(ingredient_id=1001)
        
        assert result is None

    @pytest.mark.asyncio
    async def test_get_shelf_life_days(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test shelf life retrieval."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        
        result = await service.get_shelf_life_days(ingredient_id=1001)
        
        assert result == 7

    @pytest.mark.asyncio
    async def test_get_shelf_life_days_default(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test default shelf life when undefined."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        ingredient = sample_ingredients[0]
        ingredient.shelf_life_days = None
        service.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        
        result = await service.get_shelf_life_days(ingredient_id=1001)
        
        assert result == 30

    @pytest.mark.asyncio
    async def test_get_total_usage_last_n_days(
        self, mock_db_session, restaurant_id
    ):
        """Test total usage calculation over window."""
        service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        
        service.inventory_usage_log_repo.get_daily_usage = AsyncMock(
            return_value=[
                (date.today() - timedelta(days=i), Decimal("2.00"))
                for i in range(90)
            ]
        )
        
        result = await service.get_total_usage_last_n_days(ingredient_id=1001, days=90)
        
        assert result == Decimal("180.00")  # 2.00 * 90 days
