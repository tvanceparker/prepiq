# -*- coding: utf-8 -*-


import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.reorder_forecast_engine import ReorderForecastEngine


@pytest.mark.asyncio
async def test_calculate_safety_stock(mocker):
    stats_service_mock = mocker.MagicMock()
    stats_service_mock.get_std_dev_usage = AsyncMock(return_value=Decimal("2.5"))

    engine = ReorderForecastEngine(db=None, restaurant_id=1)
    engine.stats_service = stats_service_mock

    result = await engine.calculate_safety_stock(ingredient_id=42, lead_time=4)
    # 1.65 * 2.5 * sqrt(4) = 1.65 * 2.5 * 2 = 8.25
    assert result == Decimal("8.25")


@pytest.mark.asyncio
async def test_calculate_reorder_point(mocker):
    stats_service_mock = mocker.MagicMock()
    stats_service_mock.get_lead_time_days = AsyncMock(return_value=3)
    stats_service_mock.get_average_daily_usage = AsyncMock(return_value=Decimal("10"))
    engine = ReorderForecastEngine(db=None, restaurant_id=1)
    engine.stats_service = stats_service_mock
    engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5"))

    result = await engine.calculate_reorder_point(ingredient_id=100)
    # (10 * 3) + 5 = 35
    assert result == Decimal("35.00")



@pytest.mark.asyncio
async def test_classify_abc_item_defaults_to_c(mocker):
    ingredient_repo_mock = mocker.MagicMock()
    ingredient_repo_mock.get_by_id = AsyncMock(
        return_value=type("FakeIngredient", (), {"abc_class": None})()
    )

    engine = ReorderForecastEngine(db=None, restaurant_id=1)
    engine.ingredient_repo = ingredient_repo_mock

    result = await engine.classify_abc_item(ingredient_id=1)
    assert result == "C"
