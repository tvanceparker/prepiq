from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.forecasting_engine import ForecastingEngine


def build_sale(day_offset: int, quantity: float, menu_item_id: int = 101) -> SimpleNamespace:
    return SimpleNamespace(
        menu_item_id=menu_item_id,
        sale_timestamp=datetime.combine(
            date(2026, 4, 1) + timedelta(days=day_offset),
            datetime.min.time(),
        ),
        quantity_sold=quantity,
    )


@pytest.mark.asyncio
async def test_select_forecast_strategy_prefers_gbm_when_model_available():
    service = ForecastingEngine(MagicMock(), restaurant_id=1)

    strategy = await service.select_forecast_strategy(
        menu_item_id=101,
        model=MagicMock(),
        model_source="loaded_h2o",
        metrics={"mape": 0.15, "r2": 0.82},
        sales_history=[build_sale(0, 5), build_sale(1, 6), build_sale(2, 4)],
    )

    assert strategy["model_type_used"] == "gbm_primary"
    assert strategy["model_source"] == "loaded_h2o"
    assert strategy["metrics"]["r2"] == 0.82
    assert strategy["history_summary"]["nonzero_days"] == 3


@pytest.mark.asyncio
async def test_select_forecast_strategy_uses_intermittent_for_sparse_history():
    service = ForecastingEngine(MagicMock(), restaurant_id=1)

    strategy = await service.select_forecast_strategy(
        menu_item_id=101,
        model=None,
        model_source="fallback_without_model",
        sales_history=[build_sale(0, 4), build_sale(20, 3)],
    )

    assert strategy["model_type_used"] == "intermittent"
    assert strategy["model_source"] == "fallback_without_model"
    assert strategy["history_summary"]["intermittent_ratio"] > 0.6


@pytest.mark.asyncio
async def test_select_forecast_strategy_uses_fallback_when_no_history_exists():
    service = ForecastingEngine(MagicMock(), restaurant_id=1)

    strategy = await service.select_forecast_strategy(
        menu_item_id=101,
        model=None,
        model_source="fallback_without_model",
        sales_history=[],
    )

    assert strategy["model_type_used"] == "fallback"
    assert strategy["model_source"] == "fallback_without_model"
    assert strategy["history_summary"]["history_days"] == 0


@pytest.mark.asyncio
async def test_generate_forecast_with_metadata_falls_back_from_gbm_to_baseline():
    service = ForecastingEngine(MagicMock(), restaurant_id=1)
    service._generate_primary_gbm_forecast = AsyncMock(return_value=[])
    service._select_non_gbm_strategy = MagicMock(
        return_value={
            "model_type_used": "baseline",
            "model_source": "gbm_error_fallback",
            "selection_reason": "Primary GBM forecast failed.",
        }
    )
    service._generate_baseline_forecast = AsyncMock(
        return_value=[
            {"forecast_date": date(2026, 4, 15), "predicted_quantity": 3.0}
        ]
    )

    forecast_rows, strategy = await service.generate_forecast_with_metadata(
        menu_item_id=101,
        horizon_days=1,
        strategy_metadata={
            "model_type_used": "gbm_primary",
            "model_source": "loaded_h2o",
            "metrics": {"mape": 0.2},
            "history_summary": {
                "history_days": 14,
                "nonzero_days": 14,
                "recent_nonzero_days": 7,
                "intermittent_ratio": 0.0,
            },
        },
        model=MagicMock(),
        sales_history=[build_sale(day_offset, 5) for day_offset in range(14)],
    )

    assert forecast_rows == [
        {"forecast_date": date(2026, 4, 15), "predicted_quantity": 3.0}
    ]
    assert strategy["model_type_used"] == "baseline"
    assert strategy["model_source"] == "gbm_error_fallback"
    service._generate_baseline_forecast.assert_awaited_once()


@pytest.mark.asyncio
async def test_write_forecast_results_persists_strategy_metadata():
    service = ForecastingEngine(MagicMock(), restaurant_id=1)
    service.forecast_repo = AsyncMock()
    service.forecast_breakdown_repo = AsyncMock()
    service.forecast_repo.get_by_period_and_menu_item = AsyncMock(return_value=None)
    service.forecast_repo.create = AsyncMock(
        return_value=SimpleNamespace(forecast_id=42)
    )

    forecast_data = [
        {
            "forecast_date": date(2026, 4, 15),
            "predicted_quantity": 4.0,
        },
        {
            "forecast_date": date(2026, 4, 16),
            "predicted_quantity": 6.0,
        },
    ]
    strategy_metadata = {
        "model_type_used": "baseline",
        "model_source": "historical_baseline",
        "selection_reason": "No GBM model was available.",
        "metrics": {"mape": 0.12, "r2": 0.76},
        "history_summary": {"history_days": 30, "nonzero_days": 24},
    }

    await service.write_forecast_results(
        menu_item_id=101,
        forecast_data=forecast_data,
        confidence_score=0.88,
        strategy_metadata=strategy_metadata,
    )

    payload = service.forecast_repo.create.await_args.args[0]
    assert payload["model_type_used"] == "baseline"
    assert payload["model_source"] == "historical_baseline"
    assert payload["model_metadata"]["metrics"]["mape"] == 0.12
    assert payload["model_metadata"]["history_summary"]["history_days"] == 30
    assert payload["model_metadata"]["confidence_score"] == 0.88
    assert service.forecast_breakdown_repo.create.await_count == 2