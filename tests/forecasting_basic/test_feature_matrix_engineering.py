import asyncio
import pandas as pd
from datetime import date, timedelta

import pytest

from app.services.forecasting_engine_basic import ForecastingEngineBasic


class DummyRow:
    def __init__(self, menu_item_id, sale_timestamp, quantity_sold):
        self.menu_item_id = menu_item_id
        self.sale_timestamp = sale_timestamp
        self.quantity_sold = quantity_sold


class DummySalesRepo:
    def __init__(self, rows):
        self.rows = rows

    async def get_sales_between_dates(self, start_date, end_date):
        out = []
        from datetime import datetime as _dt, date as _date
        for r in self.rows:
            ts = getattr(r, 'sale_timestamp', r.sale_timestamp)
            if isinstance(ts, _dt):
                d = ts.date()
            elif isinstance(ts, _date):
                d = ts
            else:
                # Fallback: try calling .date()
                try:
                    d = ts.date()
                except Exception:
                    d = ts

            if start_date <= d <= end_date:
                out.append(r)
        return out


class DummyForecastBreakdownRepo:
    def __init__(self, rows):
        self.rows = rows

    async def get_latest_by_date_range(self, start_date, end_date):
        return [r for r in self.rows if start_date <= r.forecast_date <= end_date]


class DummyDailyAccuracyRepo:
    def __init__(self, rows):
        self.rows = rows

    async def get_by_date_range(self, start_date, end_date):
        return [r for r in self.rows if start_date <= r.forecast_date <= end_date]


class DummyBreakdownRow:
    def __init__(self, forecast_date, menu_item_id, forecasted_quantity):
        self.forecast_date = forecast_date
        self.menu_item_id = menu_item_id
        self.forecasted_quantity = forecasted_quantity


class DummyAccRow:
    def __init__(self, forecast_date, menu_item_id, error_percentage):
        self.forecast_date = forecast_date
        self.menu_item_id = menu_item_id
        self.error_percentage = error_percentage


@pytest.mark.asyncio
async def test_build_feature_matrix_includes_engineered_columns():
    # Prepare 30 days of sales for menu_item_id=1
    today = date.today()
    rows = []
    for i in range(30):
        rows.append(DummyRow(1, today - timedelta(days=29-i), 5 + (i % 7)))

    # create one forecast breakdown mid-range
    fb_rows = [DummyBreakdownRow(today - timedelta(days=10), 1, 6)]
    acc_rows = [DummyAccRow(today - timedelta(days=10), 1, 12.5)]

    svc = ForecastingEngineBasic(db=None, restaurant_id=1)
    # inject dummy repos
    svc.sales_repo = DummySalesRepo(rows)
    svc.forecast_breakdown_repo = DummyForecastBreakdownRepo(fb_rows)
    svc.daily_forecast_accuracy_repo = DummyDailyAccuracyRepo(acc_rows)

    df = await svc._build_feature_matrix(1, lookback_days=30)

    # Basic expectations
    assert not df.empty
    expected_cols = {
        'date', 'quantity_sold', 'prev_forecasted_quantity', 'prev_error_percentage',
        'lag_1', 'lag_7', 'forecast_error', 'forecast_error_pct', 'rolling_error_7', 'prev_forecast_ratio'
    }
    assert expected_cols.issubset(set(df.columns)), f"Missing columns: {expected_cols - set(df.columns)}"

    # Check that the date with the injected forecast has non-zero prev_forecasted_quantity
    target_date = (today - timedelta(days=10))
    row = df[df['date'] == pd.to_datetime(target_date).date()]
    assert not row.empty
    assert float(row['prev_forecasted_quantity'].iloc[0]) == 6.0
    assert float(row['prev_error_percentage'].iloc[0]) == 12.5


if __name__ == '__main__':
    asyncio.run(test_build_feature_matrix_includes_engineered_columns())
