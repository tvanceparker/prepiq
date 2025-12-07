"""
End-to-End tests for complete EOD Pipeline.

Tests the full finalize_end_of_day_summary workflow for Master tier.
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.eod_service import EODService


class TestEODPipelineE2E:
    """End-to-end tests for complete EOD pipeline execution."""

    @pytest.mark.asyncio
    async def test_complete_eod_master_tier_success(
        self,
        mock_db_session,
        restaurant_id,
        test_date,
        sample_sales_data,
        sample_menu_items,
        sample_ingredients,
        sample_inventory,
        sample_suppliers,
        sample_eod_ledger,
    ):
        """
        Test complete EOD pipeline for Master tier from start to finish.
        
        Flow:
        1. Check/create ledger
        2. Aggregate sales
        3. Deduct inventory
        4. Generate forecasts
        5. Classify ingredients (ABC)
        6. Generate reorder suggestions
        7. Write purchase orders
        8. Finalize ledger
        """
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        
        # ===== Setup Ledger =====
        service.ledger_repo.get_or_create = AsyncMock(return_value=sample_eod_ledger)
        service.ledger_repo.mark_running = AsyncMock()
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.ledger_repo.finalize = AsyncMock()
        
        # ===== Stage 1: Sales Aggregation =====
        service.sales_repo.get_by_date = AsyncMock(return_value=sample_sales_data)
        service.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[
            MagicMock(recipe_id=301)
        ])
        service.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(
                ingredient_type="ingredient",
                reference_id=1001,
                quantity_used=Decimal("0.25")
            )
        ])
        service.ingredient_repo.get_by_id = AsyncMock(
            side_effect=lambda id: next(ing for ing in sample_ingredients if ing.ingredient_id == id)
        )
        
        # ===== Stage 2: Inventory Deduction =====
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            side_effect=lambda id: next(
                inv for inv in sample_inventory if inv.ingredient_id == id
            )
        )
        service.inventory_repo.decrement_quantity = AsyncMock(
            side_effect=lambda inventory_id, amount: next(
                inv for inv in sample_inventory if inv.inventory_id == inventory_id
            )
        )
        service.inventory_usage_log_repo.create = AsyncMock()
        async def fake_deduct(usage_summary, reference_type=None, reference_id=None):
            if usage_summary:
                await service.inventory_repo.decrement_quantity(sample_inventory[0].inventory_id, Decimal("1"))
            return {"deducted_items": [{"inventory_id": sample_inventory[0].inventory_id, "ingredient_id": 1001}]}
        service.inventory_helper.deduct_usage_summary = AsyncMock(side_effect=fake_deduct)
        
        # ===== Stage 3: Forecasting =====
        service.forecasting_engine.initialize = AsyncMock()
        service.forecasting_engine.run_forecasting_pipeline = AsyncMock(return_value={
            1001: {
                "total_quantity": Decimal("45.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (test_date + timedelta(days=i), Decimal("1.50"))
                    for i in range(30)
                ],
            },
            1002: {
                "total_quantity": Decimal("25.00"),
                "unit": "head",
                "daily_breakdown": [
                    (test_date + timedelta(days=i), Decimal("0.83"))
                    for i in range(30)
                ],
            },
        })
        
        # Mock accuracy evaluation (called by _stage_forecast)
        service.forecasting_engine.evaluate_and_record_daily_forecast_accuracy = AsyncMock()
        service.forecasting_engine.evaluate_and_record_accuracy = AsyncMock()
        
        # ===== Stage 4: ABC Classification =====
        service.reorder_engine.classify_all_ingredients = AsyncMock()
        service.reorder_engine.ingredient_repo.get_all = AsyncMock(
            return_value=sample_ingredients
        )
        
        # ===== Stage 5: Reorder Suggestions =====
        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            side_effect=lambda id: [
                sup for sup in sample_suppliers if sup.ingredient_id == id
            ]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            side_effect=lambda id: next(
                (inv for inv in sample_inventory if inv.ingredient_id == id), None
            )
        )
        
        # Mock reorder engine calculations
        service.reorder_engine.stats_service.get_current_inventory = AsyncMock(
            return_value=(Decimal("20.00"), "lb")
        )
        service.reorder_engine.classify_abc_item = AsyncMock(return_value="A")
        service.reorder_engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5.00"))
        service.reorder_engine.calculate_max_order = AsyncMock(return_value=Decimal("100.00"))
        service.reorder_engine.suggest_reorder_quantity = AsyncMock(return_value=Decimal("30.00"))
        service.reorder_engine.alert_repo = AsyncMock()
        service.reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            side_effect=lambda id: next(ing for ing in sample_ingredients if ing.ingredient_id == id)
        )
        
        # ===== Stage 6: Purchase Order Writing =====
        mock_order = MagicMock(order_id=7001)
        service.purchase_order_repo.create = AsyncMock(return_value=mock_order)
        service.purchase_order_item_repo.create = AsyncMock()
        service.ingredient_supplier_repo.get_price_per_unit = AsyncMock(
            return_value=Decimal("4.50")
        )
        service.purchase_order_repo.update = AsyncMock()
        
        # ===== Execute Complete Pipeline =====
        result = await service.finalize_end_of_day_summary(
            date=test_date,
            commit=True,
            forecast_horizon_days=30,
            reorder_horizon_days=30,
        )
        
        # ===== Verify Results =====
        assert result["usage_summary_count"] >= 1
        assert result["forecasted_ingredients"] >= 1
        assert result["purchase_orders_created"] >= 0
        
        # Verify ledger operations
        service.ledger_repo.get_or_create.assert_called_once_with(run_date=test_date)
        service.ledger_repo.mark_running.assert_called_once()
        service.ledger_repo.finalize.assert_called_once()
        
        # Verify sales aggregation happened
        service.sales_repo.get_by_date.assert_called_once_with(test_date)
        
        # Verify inventory deduction happened
        assert service.inventory_repo.decrement_quantity.call_count >= 1
        
        # Verify forecasting happened
        service.forecasting_engine.run_forecasting_pipeline.assert_called_once()
        
        # Verify ABC classification
        service.reorder_engine.classify_all_ingredients.assert_called_once()
        
        # Verify database commits
        assert mock_db_session.commit.call_count >= 4  # After each major stage

    @pytest.mark.asyncio
    async def test_eod_pipeline_with_no_sales_data(
        self,
        mock_db_session,
        restaurant_id,
        test_date,
        sample_eod_ledger,
    ):
        """Test EOD pipeline handles gracefully when no sales data exists."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        
        service.ledger_repo.get_or_create = AsyncMock(return_value=sample_eod_ledger)
        service.ledger_repo.mark_running = AsyncMock()
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.ledger_repo.finalize = AsyncMock()
        
        # No sales data
        service.sales_repo.get_by_date = AsyncMock(return_value=[])
        
        # Mock forecasting to return empty
        service.forecasting_engine.initialize = AsyncMock()
        service.forecasting_engine.run_forecasting_pipeline = AsyncMock(return_value={})
        service.forecasting_engine.evaluate_and_record_daily_forecast_accuracy = AsyncMock()
        service.forecasting_engine.evaluate_and_record_accuracy = AsyncMock()
        
        service.reorder_engine.classify_all_ingredients = AsyncMock()
        
        result = await service.finalize_end_of_day_summary(
            date=test_date,
            commit=True,
            forecast_horizon_days=30,
            reorder_horizon_days=30,
        )
        
        # Should complete without errors
        assert result["usage_summary_count"] == 0
        assert result["forecasted_ingredients"] == 0
        assert result["purchase_orders_created"] == 0

    @pytest.mark.asyncio
    async def test_eod_pipeline_idempotency(
        self,
        mock_db_session,
        restaurant_id,
        test_date,
        sample_eod_ledger,
    ):
        """Test EOD pipeline skips already-completed stages on re-run."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        
        # Mark stages as already complete
        ledger = sample_eod_ledger
        ledger.sales_deducted = True
        ledger.forecast_completed = True
        ledger.reorder_completed = True
        ledger.po_written = True
        
        service.ledger_repo.get_or_create = AsyncMock(return_value=ledger)
        service.ledger_repo.mark_running = AsyncMock()
        service.ledger_repo.finalize = AsyncMock()
        
        # These should NOT be called
        service.aggregate_daily_sales = AsyncMock()
        service.generate_forecast = AsyncMock()
        service.generate_suggested_purchase_orders = AsyncMock()
        service.write_purchase_orders_to_db = AsyncMock()
        
        result = await service.finalize_end_of_day_summary(
            date=test_date,
            commit=True,
            forecast_horizon_days=30,
            reorder_horizon_days=30,
        )
        
        # All stages should be skipped
        service.aggregate_daily_sales.assert_not_called()
        service.generate_forecast.assert_not_called()
        service.generate_suggested_purchase_orders.assert_not_called()
        service.write_purchase_orders_to_db.assert_not_called()

    @pytest.mark.asyncio
    async def test_eod_pipeline_error_recovery(
        self,
        mock_db_session,
        restaurant_id,
        test_date,
        sample_eod_ledger,
    ):
        """Test EOD pipeline handles errors and triggers rollback."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        
        service.ledger_repo.get_or_create = AsyncMock(return_value=sample_eod_ledger)
        service.ledger_repo.mark_running = AsyncMock()
        
        # Simulate error during sales aggregation
        service.sales_repo.get_by_date = AsyncMock(
            side_effect=Exception("Database connection error")
        )
        
        # Should raise exception and trigger rollback
        with pytest.raises(Exception, match="Database connection error"):
            await service.finalize_end_of_day_summary(
                date=test_date,
                commit=True,
                forecast_horizon_days=30,
                reorder_horizon_days=30,
            )
        
        # Verify rollback was called
        mock_db_session.rollback.assert_called()

    @pytest.mark.asyncio
    async def test_eod_pipeline_stage_timing_tracking(
        self,
        mock_db_session,
        restaurant_id,
        test_date,
        sample_sales_data,
        sample_eod_ledger,
    ):
        """Test EOD pipeline tracks timing for each stage."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        
        service.ledger_repo.get_or_create = AsyncMock(return_value=sample_eod_ledger)
        service.ledger_repo.mark_running = AsyncMock()
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.ledger_repo.finalize = AsyncMock()
        
        # Minimal mocks
        service.sales_repo.get_by_date = AsyncMock(return_value=sample_sales_data[:1])
        service.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[])
        service.deduct_ingredients_from_inventory = AsyncMock()
        
        service.forecasting_engine.initialize = AsyncMock()
        service.forecasting_engine.run_forecasting_pipeline = AsyncMock(return_value={})
        service.forecasting_engine.evaluate_and_record_daily_forecast_accuracy = AsyncMock()
        service.forecasting_engine.evaluate_and_record_accuracy = AsyncMock()
        
        service.reorder_engine.classify_all_ingredients = AsyncMock()
        
        await service.finalize_end_of_day_summary(
            date=test_date,
            commit=True,
            forecast_horizon_days=30,
            reorder_horizon_days=30,
        )
        
        # Verify mark_stage_complete was called with timing info
        assert service.ledger_repo.mark_stage_complete.call_count >= 4
        
        # Each call should include duration_ms
        for call in service.ledger_repo.mark_stage_complete.call_args_list:
            args = call[0]
            duration_ms = args[2]
            assert isinstance(duration_ms, int)
            assert duration_ms >= 0


class TestEODPipelineBasicTier:
    """Test EOD pipeline for Basic tier (minimal processing)."""

    @pytest.mark.asyncio
    async def test_eod_basic_tier_minimal_processing(
        self,
        mock_db_session,
        restaurant_id,
        test_date,
        sample_eod_ledger,
    ):
        """Test EOD pipeline for Basic tier runs minimal forecasting only."""
        service = EODService(mock_db_session, restaurant_id, "basic")
        
        service.ledger_repo.get_or_create = AsyncMock(return_value=sample_eod_ledger)
        service.ledger_repo.mark_running = AsyncMock()
        service.ledger_repo.finalize = AsyncMock()
        
        # Mock basic forecasting engine
        with patch('app.services.eod_service.ForecastingEngineBasic') as MockBasicEngine:
            mock_basic = AsyncMock()
            MockBasicEngine.return_value = mock_basic
            
            result = await service.finalize_end_of_day_summary(
                date=test_date,
                commit=True,
                forecast_horizon_days=30,
                reorder_horizon_days=30,
            )
        
        # Verify basic engine was used
        mock_basic.run.assert_called_once_with(test_date)
        
        # Basic tier should have minimal metrics
        assert result["usage_summary_count"] == 0
        assert result["forecasted_ingredients"] == 0
        assert result["purchase_orders_created"] == 0
