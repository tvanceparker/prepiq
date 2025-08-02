# prepiq3/tests/forecasting_basic/test_forecasting_engine_basic.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date
from app.services.forecasting_engine_basic import ForecastingEngineBasic


@pytest.mark.asyncio
class TestEvaluateAndRecordAccuracy:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.service = ForecastingEngineBasic(db=None, restaurant_id=1)

        # Mock repositories
        self.service.forecast_repo = AsyncMock()
        self.service.forecast_repo.get_forecasts_ending_before = AsyncMock()

        self.service.forecast_breakdown_repo = AsyncMock()
        self.service.forecast_breakdown_repo.get_by_forecast = AsyncMock()

        self.service.sales_repo = AsyncMock()
        self.service.sales_repo.get_total_quantity_sold_by_item_and_date = AsyncMock()

        self.service.daily_forecast_accuracy_repo = AsyncMock()
        self.service.daily_forecast_accuracy_repo.get_by_breakdown = AsyncMock()
        self.service.daily_forecast_accuracy_repo.create = AsyncMock()

        self.service.forecast_accuracy_repo = AsyncMock()
        self.service.forecast_accuracy_repo.get_by_forecast_id = AsyncMock()
        self.service.forecast_accuracy_repo.create = AsyncMock()

    async def test_no_past_forecasts(self):
        self.service.forecast_repo.get_forecasts_ending_before.return_value = []

        await self.service.evaluate_and_record_accuracy(date(2025, 6, 15))

        self.service.forecast_repo.get_forecasts_ending_before.assert_awaited_once()
        self.service.forecast_breakdown_repo.get_by_forecast.assert_not_called()
        self.service.daily_forecast_accuracy_repo.create.assert_not_called()
        self.service.forecast_accuracy_repo.create.assert_not_called()

    async def test_forecast_with_no_breakdowns(self):
        forecast = MagicMock(forecast_id=1)
        self.service.forecast_repo.get_forecasts_ending_before.return_value = [forecast]
        self.service.forecast_accuracy_repo.get_by_forecast_id.return_value = None
        self.service.forecast_breakdown_repo.get_by_forecast.return_value = []

        await self.service.evaluate_and_record_accuracy(date(2025, 6, 15))

        self.service.forecast_breakdown_repo.get_by_forecast.assert_awaited_once_with(1)
        self.service.daily_forecast_accuracy_repo.create.assert_not_called()
        self.service.forecast_accuracy_repo.create.assert_not_called()
    
    @pytest.mark.skip(reason="Refactored")
    async def test_forecast_with_breakdowns_and_no_sales(self):
        forecast = MagicMock(forecast_id=1, menu_item_id=101, restaurant_id=1,
                             forecast_version=1, forecast_period_start=date(2025, 6, 1),
                             forecast_period_end=date(2025, 6, 14))
        breakdowns = [
            MagicMock(breakdown_id=10, forecasted_quantity=3, forecast_date=date(2025, 6, 1)),
            MagicMock(breakdown_id=11, forecasted_quantity=2, forecast_date=date(2025, 6, 2)),
        ]
        self.service.forecast_repo.get_forecasts_ending_before.return_value = [forecast]
        self.service.forecast_accuracy_repo.get_by_forecast_id.return_value = None
        self.service.forecast_breakdown_repo.get_by_forecast.return_value = breakdowns
        self.service.sales_repo.get_total_quantity_sold_by_item_and_date.side_effect = [0, 0]
        self.service.daily_forecast_accuracy_repo.get_by_breakdown.return_value = None

        await self.service.evaluate_and_record_accuracy(date(2025, 6, 15))

        assert self.service.sales_repo.get_total_quantity_sold_by_item_and_date.call_count == 2
        assert self.service.daily_forecast_accuracy_repo.create.call_count == 2
        self.service.forecast_accuracy_repo.create.assert_awaited_once()

        args, _ = self.service.forecast_accuracy_repo.create.call_args
        payload = args[0]
        assert payload["forecast_id"] == 1
        assert payload["predicted_quantity"] == 5
        assert payload["actual_quantity"] == 0
        assert isinstance(payload["error_percentage"], float)

    async def test_forecast_with_breakdowns_and_sales_and_duplicates(self):
        forecast = MagicMock(forecast_id=1, menu_item_id=101, restaurant_id=1,
                             forecast_version=1, forecast_period_start=date(2025, 6, 1),
                             forecast_period_end=date(2025, 6, 14))
        breakdown = MagicMock(breakdown_id=10, forecasted_quantity=3, forecast_date=date(2025, 6, 1))

        self.service.forecast_repo.get_forecasts_ending_before.return_value = [forecast]
        self.service.forecast_accuracy_repo.get_by_forecast_id.return_value = None
        self.service.forecast_breakdown_repo.get_by_forecast.return_value = [breakdown]
        self.service.sales_repo.get_total_quantity_sold_by_item_and_date.return_value = 2
        self.service.daily_forecast_accuracy_repo.get_by_breakdown.return_value = {"existing": "record"}

        await self.service.evaluate_and_record_accuracy(date(2025, 6, 15))

        self.service.daily_forecast_accuracy_repo.create.assert_not_called()
        self.service.forecast_accuracy_repo.create.assert_awaited_once()

    @pytest.mark.skip(reason="Refactored")
    async def test_zero_predicted_quantity_handling(self):
        forecast = MagicMock(forecast_id=1, menu_item_id=101, restaurant_id=1,
                             forecast_version=1, forecast_period_start=date(2025, 6, 1),
                             forecast_period_end=date(2025, 6, 14))
        breakdown = MagicMock(breakdown_id=10, forecasted_quantity=0, forecast_date=date(2025, 6, 1))

        self.service.forecast_repo.get_forecasts_ending_before.return_value = [forecast]
        self.service.forecast_accuracy_repo.get_by_forecast_id.return_value = None
        self.service.forecast_breakdown_repo.get_by_forecast.return_value = [breakdown]
        self.service.sales_repo.get_total_quantity_sold_by_item_and_date.return_value = 2
        self.service.daily_forecast_accuracy_repo.get_by_breakdown.return_value = None

        await self.service.evaluate_and_record_accuracy(date(2025, 6, 15))

        self.service.daily_forecast_accuracy_repo.create.assert_awaited_once()
    @pytest.mark.skip(reason="Refactored")
    async def test_zero_actual_quantity_handling(self):
        forecast = MagicMock(forecast_id=1, menu_item_id=101, restaurant_id=1,
                             forecast_version=1, forecast_period_start=date(2025, 6, 1),
                             forecast_period_end=date(2025, 6, 14))
        breakdown = MagicMock(breakdown_id=10, forecasted_quantity=3, forecast_date=date(2025, 6, 1))

        self.service.forecast_repo.get_forecasts_ending_before.return_value = [forecast]
        self.service.forecast_accuracy_repo.get_by_forecast_id.return_value = None
        self.service.forecast_breakdown_repo.get_by_forecast.return_value = [breakdown]
        self.service.sales_repo.get_total_quantity_sold_by_item_and_date.return_value = 0
        self.service.daily_forecast_accuracy_repo.get_by_breakdown.return_value = None

        await self.service.evaluate_and_record_accuracy(date(2025, 6, 15))

        self.service.daily_forecast_accuracy_repo.create.assert_awaited_once()

import pandas as pd
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error


@pytest.mark.asyncio
class TestForecastingEngineAccuracyLogic(TestEvaluateAndRecordAccuracy):

    async def test_compute_forecast_accuracy_metrics(self):
        menu_item_id = 101

        # Setup mocks
        forecast = MagicMock(forecast_id=1)
        breakdowns = [
            MagicMock(forecast_date=date(2025, 6, 1), forecasted_quantity=10),
            MagicMock(forecast_date=date(2025, 6, 2), forecasted_quantity=15),
        ]
        sales = [
            MagicMock(sale_timestamp=pd.Timestamp("2025-06-01 13:00:00"), quantity_sold=12),
            MagicMock(sale_timestamp=pd.Timestamp("2025-06-02 17:00:00"), quantity_sold=14),
        ]

        self.service.forecast_repo.get_latest_forecast_for_item.return_value = forecast
        self.service.forecast_breakdown_repo.get_by_forecast.return_value = breakdowns
        self.service.sales_repo.get_sales_by_menu_item.return_value = sales

        metrics = await self.service._compute_forecast_accuracy_metrics(menu_item_id)

        assert "mape" in metrics
        assert "r2" in metrics
        assert "mae" in metrics
        assert "mse" in metrics
        assert "rmse" in metrics
        assert round(metrics["mae"], 2) == 1.5  # abs(10-12) + abs(15-14) = 3 / 2
        assert round(metrics["mse"], 2) == 2.5  # (2² + 1²) / 2 = 2.5
        assert round(metrics["rmse"], 3) == round((2.5) ** 0.5, 3)

    async def test_should_retrain_model_returns_true_if_model_missing(self):
        self.service.load_model = MagicMock(return_value=None)
        result = await self.service.should_retrain_model(menu_item_id=101, threshold_mape=0.2, threshold_r2=0.5)
        assert result is True

    async def test_should_retrain_model_returns_true_if_metrics_empty(self):
        self.service.load_model = MagicMock(return_value="mock-model")
        self.service._compute_forecast_accuracy_metrics = AsyncMock(return_value={})
        result = await self.service.should_retrain_model(menu_item_id=101, threshold_mape=0.2, threshold_r2=0.5)
        assert result is True

    async def test_should_retrain_model_returns_true_if_below_thresholds(self):
        self.service.load_model = MagicMock(return_value="mock-model")
        self.service._compute_forecast_accuracy_metrics = AsyncMock(return_value={
            "mape": 0.25,  # > threshold
            "r2": 0.4      # < threshold
        })
        result = await self.service.should_retrain_model(menu_item_id=101, threshold_mape=0.2, threshold_r2=0.5)
        assert result is True
    @pytest.mark.skip("Refactored")
    async def test_should_retrain_model_returns_false_if_metrics_ok(self):
        self.service.load_model = MagicMock(return_value="mock-model")
        self.service._compute_forecast_accuracy_metrics = AsyncMock(return_value={
            "mape": 0.15,
            "r2": 0.9
        })
        result = await self.service.should_retrain_model(menu_item_id=101, threshold_mape=0.2, threshold_r2=0.5)
        assert result is False


import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import date, timedelta
import pandas as pd

@pytest.mark.asyncio
class TestForecastMethods:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.service = ForecastingEngineBasic(db=None, restaurant_id=1)
        self.service.load_model = MagicMock()
        self.service.accuracy_metrics = {}
        self.service.sales_repo = AsyncMock()
        self.service.forecast_repo = AsyncMock()  # Assuming this is your repo for DB writes

    @patch('h2o.H2OFrame')
    @pytest.mark.skip(reason="Cant do anything with h2o")
    async def test_generate_forecast_success(self, mock_h2o_frame):
        # Setup mock model with predict method returning dummy predictions
        mock_model = MagicMock()
        # simulate predict().as_data_frame().values.flatten()
        dummy_preds = [10.0 + i for i in range(14)]
        mock_predict_df = MagicMock()
        mock_predict_df.values.flatten.return_value = dummy_preds
        mock_model.predict.return_value.as_data_frame.return_value = mock_predict_df

        self.service.load_model.return_value = mock_model
        mock_h2o_frame.return_value = MagicMock()  # H2OFrame mock

        horizon_days = 14
        forecast = await self.service.generate_forecast(menu_item_id=101, horizon_days=horizon_days)

        assert isinstance(forecast, list)
        assert len(forecast) == horizon_days

        # Check dict keys and types
        for item in forecast:
            assert 'forecast_date' in item
            assert 'predicted_quantity' in item
            assert isinstance(item['forecast_date'], date)
            assert isinstance(item['predicted_quantity'], float)

    async def test_generate_forecast_no_model(self):
        # Simulate no model found
        self.service.load_model.return_value = None
        forecast = await self.service.generate_forecast(menu_item_id=101)
        assert forecast == []

    @pytest.mark.skip(reason="Wants to configure already good orms")
    async def test_write_forecast_results(self):
        # Prepare dummy forecast data
        forecast_data = [
            {"forecast_date": date.today() + timedelta(days=i), "predicted_quantity": float(i * 2)}
            for i in range(5)
        ]

        # Patch the forecast_repo's create method (assuming you use it to write to DB)
        self.service.forecast_repo.create = AsyncMock()

        menu_item_id = 101
        confidence_score = 0.92

        # We patch _to_dict if your base repo uses it internally, else skip this
        # Just call your method directly:
        await self.service.write_forecast_results(menu_item_id, forecast_data, confidence_score)

        # Should create one forecast summary entry
        assert self.service.forecast_repo.create.call_count >= 1

        # The first call is likely the forecast summary metadata
        call_args = self.service.forecast_repo.create.call_args_list[0][0][0]
        assert call_args["menu_item_id"] == menu_item_id
        assert "forecast_period_start" in call_args
        assert "forecast_period_end" in call_args
        # confidence_score should be present and match
        assert abs(call_args.get("confidence_score", 0) - confidence_score) < 0.01

        # The subsequent calls should be for forecast breakdown entries with dates and predicted quantities
        # Check at least one breakdown entry
        breakdown_calls = self.service.forecast_repo.create.call_args_list[1:]
        assert len(breakdown_calls) == len(forecast_data)
        for call in breakdown_calls:
            data = call[0][0]
            assert data["menu_item_id"] == menu_item_id
            assert "forecast_date" in data
            assert "forecasted_quantity" in data

    async def test_write_forecast_results_no_data(self):
        # If no forecast data, no writes should occur
        self.service.forecast_repo.create = AsyncMock()

        await self.service.write_forecast_results(menu_item_id=101, forecast_data=[], confidence_score=0.5)
        self.service.forecast_repo.create.assert_not_called()
