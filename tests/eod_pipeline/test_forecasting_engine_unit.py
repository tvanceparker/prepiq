"""
Unit tests for ForecastingEngine.

Tests forecasting pipeline, accuracy evaluation, breakdown generation, and model operations.
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.forecasting_engine import ForecastingEngine, convert_forecast_dict_to_list


class TestForecastingEngineUnit:
    """Unit tests for individual ForecastingEngine methods."""

    @pytest.mark.asyncio
    async def test_initialize_noop(
        self, mock_db_session, restaurant_id
    ):
        """Test initialize is a no-op for advanced pipeline."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        # Should not raise
        await engine.initialize()

    @pytest.mark.asyncio
    async def test_raise_alert(
        self, mock_db_session, restaurant_id
    ):
        """Test alert creation."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        engine.alert_repo.create = AsyncMock()
        
        await engine._raise_alert(
            alert_type="TestAlert",
            message="Test message",
            severity="warning",
            meta={"key": "value"}
        )
        
        engine.alert_repo.create.assert_called_once()
        call_args = engine.alert_repo.create.call_args[0][0]
        assert call_args["alert_type"] == "TestAlert"
        assert call_args["message"] == "Test message"
        assert call_args["severity"] == "warning"
        assert call_args["meta"] == {"key": "value"}

    @pytest.mark.asyncio
    async def test_derive_confidence_score_with_both_metrics(
        self, mock_db_session, restaurant_id
    ):
        """Test confidence score derivation with MAPE and R2."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        metrics = {
            "mape": 0.15,  # 15% error -> confidence ~0.85
            "r2": 0.80,    # R2 0.80 -> confidence 0.80
        }
        
        result = engine._derive_confidence_score(metrics)
        
        # Average of (1 - 0.15/100) and 0.80 ≈ 0.90
        assert result is not None
        assert 0.80 <= result <= 0.90

    @pytest.mark.asyncio
    async def test_derive_confidence_score_no_metrics(
        self, mock_db_session, restaurant_id
    ):
        """Test confidence score returns None when no metrics available."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        result = engine._derive_confidence_score(None)
        
        assert result is None

    @pytest.mark.asyncio
    async def test_derive_confidence_score_empty_metrics(
        self, mock_db_session, restaurant_id
    ):
        """Test confidence score returns None for empty metrics."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        result = engine._derive_confidence_score({})
        
        assert result is None

    @pytest.mark.asyncio
    async def test_should_retrain_model_no_existing_model(
        self, mock_db_session, restaurant_id
    ):
        """Test retrain decision when no model exists."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        with patch('app.services.forecasting_engine.load_model', return_value=None):
            with patch('h2o.init'):
                with patch('h2o.connection', return_value=True):
                    result = await engine.should_retrain_model(
                        menu_item_id=101,
                        threshold_mape=0.20,
                        threshold_r2=0.70
                    )
        
        assert result is True

    @pytest.mark.asyncio
    async def test_should_retrain_model_poor_accuracy(
        self, mock_db_session, restaurant_id
    ):
        """Test retrain decision when accuracy is poor."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        engine._compute_forecast_accuracy_metrics = AsyncMock(return_value={
            "mape": 0.30,  # Above threshold of 0.20
            "r2": 0.50,    # Below threshold of 0.70
        })
        
        with patch('app.services.forecasting_engine.load_model', return_value=MagicMock()):
            with patch('h2o.init'):
                with patch('h2o.connection', return_value=True):
                    result = await engine.should_retrain_model(
                        menu_item_id=101,
                        threshold_mape=0.20,
                        threshold_r2=0.70
                    )
        
        assert result is True

    @pytest.mark.asyncio
    async def test_should_retrain_model_good_accuracy(
        self, mock_db_session, restaurant_id
    ):
        """Test no retrain when accuracy is acceptable."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        engine._compute_forecast_accuracy_metrics = AsyncMock(return_value={
            "mape": 0.10,  # Below threshold
            "r2": 0.85,    # Above threshold
        })
        
        with patch('app.services.forecasting_engine.load_model', return_value=MagicMock()):
            with patch('h2o.init'):
                with patch('h2o.connection', return_value=True):
                    result = await engine.should_retrain_model(
                        menu_item_id=101,
                        threshold_mape=0.20,
                        threshold_r2=0.70
                    )
        
        assert result is False

    @pytest.mark.asyncio
    async def test_generate_batch_recipe_breakdown(
        self, mock_db_session, restaurant_id
    ):
        """Test batch recipe breakdown from menu item forecasts."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        # Mock recipe data
        engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[
            MagicMock(recipe_id=301)
        ])
        engine.batch_recipe_repo.get_by_id = AsyncMock(
            return_value=MagicMock(yield_unit="count")
        )
        engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(ingredient_type="batch", reference_id=5001, quantity_used=Decimal("2.00"))
        ])
        
        forecast_breakdown = {
            101: {
                "daily_breakdown": [
                    (date(2025, 11, 20), 10.0),
                    (date(2025, 11, 21), 12.0),
                ]
            }
        }
        
        result = await engine.generate_batch_recipe_breakdown(forecast_breakdown)
        
        assert len(result) == 2
        assert result[0]["batch_recipe_id"] == 5001
        assert result[0]["required_quantity"] == 20.0  # 10 * 2.0

    @pytest.mark.asyncio
    async def test_generate_ingredient_breakdown(
        self, mock_db_session, restaurant_id
    ):
        """Test ingredient breakdown from menu item and batch forecasts."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        # Mock menu item recipe ingredients
        engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(return_value=[301])
        engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[MagicMock(recipe_id=301)])
        engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(ingredient_type="ingredient", reference_id=1001, quantity_used=Decimal("0.25"))
        ])
        
        # Mock batch recipe ingredients
        engine.batch_recipe_repo.get_by_id = AsyncMock(return_value=MagicMock(
            yield_quantity=Decimal("10.00"),
            yield_unit="count"
        ))
        engine.batch_recipe_ingredients_repo.get_by_batch_recipe_id = AsyncMock(return_value=[
            MagicMock(
                ingredient_type="ingredient",
                reference_id=1002,
                ingredient_id=1002,
                quantity_used=Decimal("5.00"),
                unit="lb",
            )
        ])
        
        # Mock ingredient units
        engine.ingredient_repo.get_by_id = AsyncMock(side_effect=lambda id: MagicMock(unit="lb"))
        
        forecast_breakdown = [
            {"menu_item_id": 101, "forecast_date": date(2025, 11, 20), "predicted_quantity": 10.0}
        ]
        batch_breakdown = [
            {"batch_recipe_id": 5001, "forecast_date": date(2025, 11, 20), "required_quantity": 20.0}
        ]
        
        result = await engine.generate_ingredient_breakdown(forecast_breakdown, batch_breakdown)
        
        assert len(result) >= 1
        assert any(item["ingredient_id"] == 1001 for item in result)

    @pytest.mark.asyncio
    async def test_aggregate_ingredient_demand_for_reorder(
        self, mock_db_session, restaurant_id
    ):
        """Test ingredient demand aggregation for reorder planning."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        engine.ingredient_repo.get_by_id = AsyncMock(side_effect=lambda id: MagicMock(unit="lb"))
        
        forecast_breakdown = [
            {"ingredient_id": 1001, "forecast_date": date.today() + timedelta(days=1), "quantity": 5.0},
            {"ingredient_id": 1001, "forecast_date": date.today() + timedelta(days=2), "quantity": 6.0},
            {"ingredient_id": 1002, "forecast_date": date.today() + timedelta(days=1), "quantity": 3.0},
        ]
        
        result = await engine.aggregate_ingredient_demand_for_reorder(forecast_breakdown, days=30)
        
        assert 1001 in result
        assert result[1001]["total_quantity"] == Decimal("11.0")
        assert result[1001]["unit"] == "lb"
        assert len(result[1001]["daily_breakdown"]) == 2

    @pytest.mark.asyncio
    async def test_derive_ingredient_usage_from_sales(
        self, mock_db_session, restaurant_id, sample_sales_data
    ):
        """Test ingredient usage derivation from sales data."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        engine.sales_repo.get_sales_between_dates = AsyncMock(return_value=sample_sales_data)
        engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(return_value=[301])
        engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(ingredient_type="ingredient", reference_id=1001, quantity_used=Decimal("0.25"))
        ])
        engine.batch_recipe_repo.get_by_id = AsyncMock(return_value=MagicMock(
            yield_quantity=Decimal("1.00"),
            yield_unit="count"
        ))
        engine.batch_recipe_ingredients_repo.get_by_batch_recipe_id = AsyncMock(return_value=[])
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(unit="lb"))
        engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[MagicMock(recipe_id=301)])
        
        result = await engine.derive_ingredient_usage_from_sales(days=30)
        
        assert isinstance(result, dict)
        assert 1001 in result

    @pytest.mark.asyncio
    async def test_generate_batch_prep_suggestions(
        self, mock_db_session, restaurant_id
    ):
        """Test batch prep suggestions generation."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        # Setup latest forecasts
        engine.latest_menu_item_forecasts = {
            101: {
                "daily_breakdown": [
                    (date.today() + timedelta(days=i), 10.0)
                    for i in range(7)
                ]
            }
        }
        
        engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[
            MagicMock(recipe_id=301)
        ])
        engine.batch_recipe_repo.get_by_id = AsyncMock(
            return_value=MagicMock(yield_unit="count")
        )
        engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(ingredient_type="batch", reference_id=5001, quantity_used=Decimal("2.00"))
        ])
        
        result = await engine.generate_batch_prep_suggestions(horizon_days=7)
        
        assert len(result) == 7
        assert all(item["batch_recipe_id"] == 5001 for item in result)

    @pytest.mark.asyncio
    async def test_generate_batch_prep_suggestions_no_batches(
        self, mock_db_session, restaurant_id
    ):
        """Test batch prep suggestions when no batches needed."""
        engine = ForecastingEngine(mock_db_session, restaurant_id, "master")
        
        engine.latest_menu_item_forecasts = {
            101: {
                "daily_breakdown": [
                    (date.today() + timedelta(days=i), 10.0)
                    for i in range(7)
                ]
            }
        }
        
        engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[
            MagicMock(recipe_id=301)
        ])
        engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(ingredient_type="ingredient", reference_id=1001, quantity_used=Decimal("0.25"))
        ])
        
        result = await engine.generate_batch_prep_suggestions(horizon_days=7)
        
        assert len(result) == 0


class TestConvertForecastDictToList:
    """Test the helper function for converting forecast dict to list."""

    def test_convert_forecast_dict_to_list(self):
        """Test conversion of forecast dictionary to flat list."""
        forecast_dict = {
            101: {
                "daily_breakdown": [
                    (date(2025, 11, 20), 10.0),
                    (date(2025, 11, 21), 12.0),
                ]
            },
            102: {
                "daily_breakdown": [
                    (date(2025, 11, 20), 5.0),
                ]
            }
        }
        
        result = convert_forecast_dict_to_list(forecast_dict)
        
        assert len(result) == 3
        assert all("menu_item_id" in item for item in result)
        assert all("forecast_date" in item for item in result)
        assert all("predicted_quantity" in item for item in result)

    def test_convert_forecast_dict_to_list_empty(self):
        """Test conversion with empty dict."""
        result = convert_forecast_dict_to_list({})
        
        assert result == []
