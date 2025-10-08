import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.inventory_stats_service import InventoryStatsService


@pytest.mark.asyncio
async def test_total_usage_falls_back_to_sales_when_logs_missing():
    service = InventoryStatsService(db=MagicMock(), restaurant_id=1)

    service.inventory_usage_log_repo.get_daily_usage = AsyncMock(return_value=[])
    service.forecasting_engine.derive_ingredient_usage_from_sales = AsyncMock(
        return_value={
            5: {
                "2024-06-01": Decimal("1.20"),
                "2024-06-02": Decimal("2.30"),
            }
        }
    )

    total = await service.get_total_usage_last_n_days(ingredient_id=5, days=7)

    service.inventory_usage_log_repo.get_daily_usage.assert_awaited_once()
    service.forecasting_engine.derive_ingredient_usage_from_sales.assert_awaited_once()
    assert total == Decimal("3.50")
