import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta, date
import pandas as pd
import numpy as np

from app.services.forecasting_engine_basic import ForecastingEngineBasic


@pytest.mark.asyncio
class TestTrainModel:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.service = ForecastingEngineBasic(db=None, restaurant_id=1)
        self.service.save_model = MagicMock()
        self.service.sales_repo = AsyncMock()

    @patch('h2o.connection', return_value=True)
    @patch('h2o.init')
    @patch('h2o.H2OFrame')
    @patch('h2o.estimators.gbm.H2OGradientBoostingEstimator', autospec=True)
    @pytest.mark.skip(reason="Cannot mock H2OGradientBoostingEstimator properly due to an super() issue")
    async def test_train_model_success(self, mock_gbm_class, mock_h2o_frame, mock_h2o_init, mock_h2o_conn):
        # Setup fake sales data (dates in order, with menu_item_id=101 and others)
        today = date.today()
        sales_data = []
        for i in range(50):  # 50 days of data
            sale = MagicMock()
            sale.menu_item_id = 101 if i % 2 == 0 else 999  # half data for menu_item_id=101
            sale.sale_timestamp = datetime.combine(today - timedelta(days=i), datetime.min.time())
            sale.quantity_sold = i + 1
            sales_data.append(sale)

        self.service.sales_repo.get_sales_between_dates.return_value = sales_data

        # Mock H2OFrame to just return a MagicMock (pretending to be a frame)
        mock_h2o_frame.side_effect = lambda df: MagicMock(name='H2OFrame')

        # Mock model instance and its methods
        mock_model_instance = MagicMock()
        mock_model_instance.predict.return_value.as_data_frame.return_value = pd.DataFrame({
            0: np.linspace(1, 25, num=10)  # dummy predictions
        })

        def r2_func(valid=False):
            return 0.85
        mock_model_instance.r2.side_effect = r2_func

        mock_gbm_class.return_value = mock_model_instance

        # Call train_model
        accuracy = await self.service.train_model(menu_item_id=101, lookback_days=60)

        # Assert save_model was called once with the menu_item_id and model
        self.service.save_model.assert_called_once_with(101, mock_model_instance)

        # Assert accuracy contains mape and r2 keys
        assert isinstance(accuracy, dict)
        assert "mape" in accuracy
        assert "r2" in accuracy
        assert isinstance(accuracy["mape"], float)
        assert isinstance(accuracy["r2"], float)
        assert accuracy["r2"] == 0.85

        # Assert sales_repo.get_sales_between_dates called once
        self.service.sales_repo.get_sales_between_dates.assert_awaited_once()

        # Assert model.train called with expected args
        mock_model_instance.train.assert_called_once()
        args, kwargs = mock_model_instance.train.call_args
        assert 'x' in kwargs and 'y' in kwargs and 'training_frame' in kwargs and 'validation_frame' in kwargs

    @patch('h2o.connection', return_value=True)
    @patch('h2o.init')
    async def test_train_model_no_data(self, mock_h2o_init, mock_h2o_conn):
        # Return empty list from sales repo to simulate no sales data
        self.service.sales_repo.get_sales_between_dates.return_value = []

        result = await self.service.train_model(menu_item_id=42)

        # Should return None when no data
        assert result is None

        # save_model should not be called
        assert not self.service.save_model.called
