import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date, timedelta, datetime
import pandas as pd

from app.services.forecasting_engine_basic import ForecastingEngineBasic


@pytest.mark.asyncio
async def test_build_feature_matrix_includes_prev_forecast_and_error():
    svc = ForecastingEngineBasic(db=None, restaurant_id=1)

    # Mock sales repo with 10 days of sales for menu_item 101
    today = date.today()
    sales = []
    for i in range(10):
        s = MagicMock()
        s.menu_item_id = 101
        s.sale_timestamp = datetime.combine(today - timedelta(days=9 - i), datetime.min.time())
        s.quantity_sold = i + 1
        sales.append(s)

    svc.sales_repo = AsyncMock()
    svc.sales_repo.get_sales_between_dates = AsyncMock(return_value=sales)

    # Mock forecast breakdowns
    fb = []
    for i in range(10):
        b = MagicMock()
        b.menu_item_id = 101
        b.forecast_date = (today - timedelta(days=9 - i))
        b.forecasted_quantity = (i + 2)
        fb.append(b)

    svc.forecast_breakdown_repo = AsyncMock()
    svc.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(return_value=fb)

    # Mock daily accuracy
    acc = []
    for i in range(10):
        a = MagicMock()
        a.menu_item_id = 101
        a.forecast_date = (today - timedelta(days=9 - i))
        a.error_percentage = float(i)
        acc.append(a)

    svc.daily_forecast_accuracy_repo = AsyncMock()
    svc.daily_forecast_accuracy_repo.get_by_date_range = AsyncMock(return_value=acc)

    df = await svc._build_feature_matrix(menu_item_id=101, lookback_days=14)

    assert not df.empty
    assert 'prev_forecasted_quantity' in df.columns
    assert 'prev_error_percentage' in df.columns
    assert 'lag_1' in df.columns
    assert 'lag_7' in df.columns
