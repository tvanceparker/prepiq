import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta

from app.services.forecasting_engine_basic import ForecastingEngineBasic


@pytest.mark.asyncio
async def test_write_forecast_results_idempotent():
    svc = ForecastingEngineBasic(db=None, restaurant_id=1)

    # Mock repos
    svc.forecast_repo = AsyncMock()
    svc.forecast_breakdown_repo = AsyncMock()

    # Simulate existing forecast -> should create a new forecast version instead of deleting
    existing = MagicMock(forecast_id=99)
    svc.forecast_repo.get_by_period_and_menu_item.return_value = existing
    svc.forecast_repo.get_next_forecast_version = AsyncMock(return_value=5)

    # Ensure we do NOT delete old breakdowns in this versioned approach
    svc.forecast_breakdown_repo.get_by_forecast.return_value = [MagicMock(breakdown_id=1)]
    svc.forecast_breakdown_repo.delete = AsyncMock()

    # Prepare forecast data
    forecast_data = [
        {"forecast_date": date.today() + timedelta(days=i), "predicted_quantity": float(i)}
        for i in range(3)
    ]

    # Run write
    await svc.write_forecast_results(menu_item_id=101, forecast_data=forecast_data, confidence_score=0.5)

    # Expect repo.create called to add a new forecast version
    svc.forecast_repo.create.assert_awaited()
    # Ensure we did not call delete on previous breakdowns (we keep historical data)
    svc.forecast_breakdown_repo.delete.assert_not_awaited()
