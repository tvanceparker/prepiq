import asyncio
from datetime import date
import pytest

from app.services.forecasting_engine_basic import ForecastingEngineBasic


class DummySalesRepo:
    def __init__(self):
        self._sales = []

    async def get_sales_between_dates(self, start_date, end_date):
        return []


class DummyDB:
    pass


@pytest.mark.asyncio
async def test_train_model_small_dataset_returns_none():
    # Arrange: Create engine with dummy DB and restaurant_id 1
    engine = ForecastingEngineBasic(db=DummyDB(), restaurant_id=1)

    # Monkeypatch the sales repo to return a very small set
    engine.sales_repo = DummySalesRepo()

    # Act
    model, metrics = await engine.train_model(menu_item_id=123, lookback_days=30)

    # Assert
    assert model is None
    assert isinstance(metrics, dict)
    assert metrics.get("mape") is None and metrics.get("r2") is None
