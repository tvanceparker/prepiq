import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.forecasting_engine import ForecastingEngine


class DummyForecast:
    def __init__(self, forecast_id: int):
        self.forecast_id = forecast_id


class DummyTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


def make_sale(menu_item_id: int, sold: int, ts: datetime) -> object:
    return type(
        "Sale",
        (),
        {
            "menu_item_id": menu_item_id,
            "sale_timestamp": ts,
            "quantity_sold": sold,
        },
    )()


def make_breakdown(
    forecast_id: int,
    menu_item_id: int,
    forecast_date: date,
    quantity: int,
) -> object:
    return type(
        "Breakdown",
        (),
        {
            "breakdown_id": forecast_id * 100 + menu_item_id,
            "forecast_id": forecast_id,
            "restaurant_id": 1,
            "menu_item_id": menu_item_id,
            "forecast_date": forecast_date,
            "forecasted_quantity": quantity,
        },
    )()


def test_derive_confidence_score_blends_metrics():
    engine = ForecastingEngine(db=MagicMock(), restaurant_id=1)
    score = engine._derive_confidence_score({"mape": 10.0, "r2": 0.8})
    assert score == pytest.approx((0.9 + 0.8) / 2, rel=1e-3)


@pytest.mark.asyncio
async def test_generate_forecast_fallback_when_no_model(monkeypatch):
    engine = ForecastingEngine(db=MagicMock(), restaurant_id=1)
    monkeypatch.setattr(
        "app.services.forecasting_engine.load_model", lambda *_, **__: None
    )

    engine.sales_repo.get_sales_between_dates = AsyncMock(
        return_value=[
            make_sale(1, 5, datetime(2025, 6, 1, 12, 0)),
            make_sale(1, 3, datetime(2025, 6, 2, 18, 0)),
        ]
    )

    forecast = await engine.generate_forecast(menu_item_id=1, horizon_days=3)
    assert len(forecast) == 3
    assert all(entry["predicted_quantity"] >= 0 for entry in forecast)


@pytest.mark.asyncio
async def test_write_forecast_results_batches_in_transaction():
    db_mock = MagicMock()
    db_mock.in_transaction.return_value = False
    db_mock.begin.return_value = DummyTransaction()

    engine = ForecastingEngine(db=db_mock, restaurant_id=1)
    engine.forecast_repo = MagicMock()
    engine.forecast_repo.get_by_period_and_menu_item = AsyncMock(return_value=None)
    engine.forecast_repo.create = AsyncMock(return_value=DummyForecast(42))
    engine.forecast_breakdown_repo = MagicMock()
    engine.forecast_breakdown_repo.create = AsyncMock()

    forecast_rows = [
        {"forecast_date": date.today(), "predicted_quantity": 3.6},
        {"forecast_date": date.today() + timedelta(days=1), "predicted_quantity": 1.2},
    ]

    await engine.write_forecast_results(menu_item_id=7, forecast_data=forecast_rows, confidence_score=0.75)

    engine.forecast_repo.create.assert_awaited()
    assert engine.forecast_breakdown_repo.create.await_count == len(forecast_rows)


@pytest.mark.asyncio
async def test_run_pipeline_missing_sales_triggers_alert(monkeypatch):
    engine = ForecastingEngine(db=MagicMock(), restaurant_id=1)
    engine.sales_repo.sales_exist_for_dates = AsyncMock(return_value=False)
    engine._raise_alert = AsyncMock()

    result = await engine.run_forecasting_pipeline(forecast_date=date(2025, 6, 3))

    assert result == {}
    engine._raise_alert.assert_awaited()


@pytest.mark.asyncio
async def test_evaluate_and_record_daily_accuracy_batches_sales(monkeypatch):
    engine = ForecastingEngine(db=MagicMock(), restaurant_id=1)

    breakdown = make_breakdown(1, 5, date(2025, 6, 3), 10)
    engine.forecast_breakdown_repo.get_forecasts_for_date = AsyncMock(return_value=[breakdown])

    sale = make_sale(5, 8, datetime(2025, 6, 3, 12, 0))
    engine.sales_repo.get_by_date = AsyncMock(return_value=[sale])

    engine.daily_forecast_accuracy_repo.exists_for_breakdown = AsyncMock(return_value=False)
    engine.daily_forecast_accuracy_repo.create = AsyncMock()
    engine.db.commit = AsyncMock()

    await engine.evaluate_and_record_daily_forecast_accuracy(date(2025, 6, 3))

    engine.daily_forecast_accuracy_repo.create.assert_awaited()
    engine.db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_aggregate_ingredient_demand_for_reorder_calculates_totals():
    engine = ForecastingEngine(db=MagicMock(), restaurant_id=1)
    engine.ingredient_repo.get_by_id = AsyncMock(
        side_effect=lambda ingredient_id: type("Ingredient", (), {"unit": "kg"})()
    )

    today = date.today()
    breakdown = [
        {"ingredient_id": 10, "forecast_date": today, "quantity": Decimal("2.5"), "unit": "kg"},
        {"ingredient_id": 10, "forecast_date": today + timedelta(days=1), "quantity": Decimal("1.5"), "unit": "kg"},
        {"ingredient_id": 12, "forecast_date": today, "quantity": Decimal("4.0"), "unit": "kg"},
    ]

    aggregated = await engine.aggregate_ingredient_demand_for_reorder(breakdown, days=3)

    assert aggregated[10]["total_quantity"] == Decimal("4.0")
    assert aggregated[12]["total_quantity"] == Decimal("4.0")
    assert aggregated[10]["unit"] == "kg"


@pytest.mark.asyncio
async def test_derive_ingredient_usage_from_sales(monkeypatch):
    engine = ForecastingEngine(db=MagicMock(), restaurant_id=1)
    engine.sales_repo.get_sales_between_dates = AsyncMock(
        return_value=[
            make_sale(1, 3, datetime(2025, 6, 1, 12, 0)),
            make_sale(2, 4, datetime(2025, 6, 2, 18, 0)),
        ]
    )

    engine.generate_batch_recipe_breakdown = AsyncMock(return_value={})
    engine.generate_ingredient_breakdown = AsyncMock(
        return_value=[
            {"ingredient_id": 101, "forecast_date": date(2025, 6, 1), "quantity": Decimal("1.25")},
            {"ingredient_id": 102, "forecast_date": date(2025, 6, 2), "quantity": Decimal("2.50")},
        ]
    )

    usage = await engine.derive_ingredient_usage_from_sales(days=30)

    assert usage[101][date(2025, 6, 1)] == Decimal("1.25")
    assert usage[102][date(2025, 6, 2)] == Decimal("2.50")
