"""
Integration tests for EOD Pipeline.

Tests interactions between services (EODService + ForecastingEngine + ReorderEngine).
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.eod_service import EODService
from app.services.forecasting_engine import ForecastingEngine
from app.services.reorder_forecast_engine import ReorderForecastEngine
from app.services.inventory_stats_service import InventoryStatsService


class TestEODPipelineIntegration:
    """Integration tests for service interactions."""

    @pytest.mark.asyncio
    async def test_eod_to_forecasting_engine_integration(
        self, mock_db_session, restaurant_id, sample_menu_items
    ):
        """Test EOD service properly invokes forecasting engine."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        
        # Mock forecast engine
        service.forecasting_engine.initialize = AsyncMock()
        service.forecasting_engine.run_forecasting_pipeline = AsyncMock(return_value={
            1001: {
                "total_quantity": Decimal("30.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (date.today() + timedelta(days=i), Decimal("1.00"))
                    for i in range(30)
                ],
            }
        })
        
        result = await service.generate_forecast(
            forecast_horizon_days=30,
            reorder_horizon_days=30
        )
        
        # Verify forecast engine was called correctly
        service.forecasting_engine.initialize.assert_called_once()
        service.forecasting_engine.run_forecasting_pipeline.assert_called_once()
        assert 1001 in result
        assert result[1001]["unit"] == "lb"

    @pytest.mark.asyncio
    async def test_forecasting_to_reorder_engine_integration(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_suppliers
    ):
        """Test forecast output feeds into reorder calculations."""
        eod_service = EODService(mock_db_session, restaurant_id, "master")
        eod_service.inventory_helper.is_real_time_enabled = AsyncMock(return_value=False)
        eod_service.reorder_engine.stats_service = mock_inventory_stats
        
        # Setup ingredient forecast
        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("45.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (date.today() + timedelta(days=i), Decimal("1.50"))
                    for i in range(30)
                ],
            }
        }
        
        # Mock dependencies
        eod_service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        eod_service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(
                shelf_life_days=7,
                unit="lb"
            )
        )
        eod_service.reorder_engine.suggest_reorder_quantity = AsyncMock(return_value=Decimal("10.00"))
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("20.00"), "lb")
        eod_service.reorder_engine.classify_abc_item = AsyncMock(return_value="A")
        eod_service.reorder_engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5.00"))
        eod_service.reorder_engine.calculate_max_order = AsyncMock(return_value=Decimal("100.00"))
        eod_service.reorder_engine.alert_repo = AsyncMock()
        eod_service.reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(name="Test Ingredient")
        )
        
        # Generate PO suggestions
        result = await eod_service.generate_suggested_purchase_orders(ingredient_forecast)
        
        # Verify reorder engine was invoked
        assert len(result) >= 1
        assert result[0]["ingredient_id"] == 1001
        assert "suggested_packs_to_order" in result[0]

    @pytest.mark.asyncio
    async def test_inventory_stats_to_reorder_engine_integration(
        self, mock_db_session, restaurant_id
    ):
        """Test inventory stats service provides data to reorder engine."""
        stats_service = InventoryStatsService(mock_db_session, restaurant_id, "master")
        reorder_engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        reorder_engine.stats_service = stats_service
        
        # Mock inventory stats data
        stats_service.get_std_dev_usage = AsyncMock(return_value=Decimal("0.75"))
        stats_service.get_average_daily_usage = AsyncMock(return_value=Decimal("2.50"))
        stats_service.get_lead_time_days = AsyncMock(return_value=3)
        
        # Calculate safety stock using integrated services
        safety_stock = await reorder_engine.calculate_safety_stock(
            ingredient_id=1001,
            lead_time=3
        )
        
        # Calculate reorder point using integrated services
        reorder_point = await reorder_engine.calculate_reorder_point(ingredient_id=1001)
        
        # Verify calculations
        assert safety_stock > Decimal("0")
        assert reorder_point > safety_stock

    @pytest.mark.asyncio
    async def test_sales_aggregation_to_inventory_deduction_integration(
        self, mock_db_session, restaurant_id, sample_sales_data, sample_inventory
    ):
        """Test sales aggregation output feeds into inventory deduction."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        # Mock sales aggregation
        service.sales_repo.get_by_date = AsyncMock(return_value=sample_sales_data[:1])
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
        service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(unit="lb"))
        
        # Get usage summary
        usage_summary = await service.aggregate_daily_sales(date(2025, 11, 20))
        
        # Mock inventory deduction
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=sample_inventory[0]
        )
        service.inventory_repo.decrement_quantity = AsyncMock(
            return_value=sample_inventory[0]
        )
        service.inventory_usage_log_repo.create = AsyncMock()
        service.inventory_helper.deduct_usage_summary = AsyncMock(
            return_value={"deducted_items": [{"ingredient_id": 1001}]}
        )
        
        # Execute deduction
        result = await service.deduct_ingredients_from_inventory(usage_summary)
        
        # Verify integration
        assert len(usage_summary) >= 1
        assert len(result["deducted_items"]) >= 1
        assert result["deducted_items"][0]["ingredient_id"] == 1001

    @pytest.mark.asyncio
    async def test_po_generation_to_database_write_integration(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        """Test PO suggestions flow through to database writes."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        # Setup PO suggestions
        service._purchase_order_suggestions = [
            {
                "ingredient_id": 1001,
                "ingredient_supplier_id": 3001,
                "supplier_id": 501,
                "lead_demand": 15.0,
                "shelf_demand": 20.0,
                "total_quantity_ordered": 50.0,
                "supplier_unit": "lb",
                "lead_time_days": 3,
            }
        ]
        service.purchase_order_suggestions = service._purchase_order_suggestions
        
        # Mock database writes
        mock_order = MagicMock(order_id=7001)
        service.purchase_order_repo.create = AsyncMock(return_value=mock_order)
        service.purchase_order_item_repo.create = AsyncMock()
        service.ingredient_supplier_repo.get_price_per_unit = AsyncMock(
            return_value=Decimal("4.50")
        )
        service.purchase_order_repo.update = AsyncMock()
        
        # Write to database
        await service.write_purchase_orders_to_db()
        
        # Verify integration
        service.purchase_order_repo.create.assert_called_once()
        service.purchase_order_item_repo.create.assert_called_once()
        service.purchase_order_repo.update.assert_called_once()


class TestEODPipelineDataFlow:
    """Test data flow through the entire pipeline."""

    @pytest.mark.asyncio
    async def test_full_ingredient_forecast_to_po_flow(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_suppliers
    ):
        """Test complete flow from forecast generation to PO creation."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.reorder_engine.stats_service = mock_inventory_stats
        
        # Step 1: Generate forecast
        service.forecasting_engine.initialize = AsyncMock()
        service.forecasting_engine.run_forecasting_pipeline = AsyncMock(return_value={
            1001: {
                "total_quantity": Decimal("30.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (date.today() + timedelta(days=i), Decimal("1.00"))
                    for i in range(30)
                ],
            }
        })
        
        ingredient_forecast = await service.generate_forecast(30, 30)
        
        # Step 2: Generate reorder suggestions
        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(shelf_life_days=7, unit="lb")
        )
            service.reorder_engine.suggest_reorder_quantity = AsyncMock(return_value=Decimal("15.00"))
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("15.00"), "lb")
        service.reorder_engine.classify_abc_item = AsyncMock(return_value="A")
        service.reorder_engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5.00"))
        service.reorder_engine.calculate_max_order = AsyncMock(return_value=Decimal("100.00"))
        service.reorder_engine.alert_repo = AsyncMock()
        service.reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(name="Test Ingredient")
        )
        
        po_suggestions = await service.generate_suggested_purchase_orders(ingredient_forecast)
        
        # Step 3: Write to database
        service._purchase_order_suggestions = po_suggestions
        service.purchase_order_suggestions = po_suggestions
        mock_order = MagicMock(order_id=7001)
        service.purchase_order_repo.create = AsyncMock(return_value=mock_order)
        service.purchase_order_item_repo.create = AsyncMock()
        service.ingredient_supplier_repo.get_price_per_unit = AsyncMock(
            return_value=Decimal("4.50")
        )
        service.purchase_order_repo.update = AsyncMock()
        
        await service.write_purchase_orders_to_db()
        
        # Verify complete flow
        assert 1001 in ingredient_forecast
        assert len(po_suggestions) >= 1
        service.purchase_order_repo.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_abc_classification_impacts_reorder_quantity(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test ABC classification affects reorder quantity calculations."""
        reorder_engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        reorder_engine.stats_service = mock_inventory_stats
        reorder_engine.alert_repo = AsyncMock()
        
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("10.00"), "lb")
        mock_inventory_stats.get_moq.return_value = Decimal("5.00")
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("200.00")
        
        # Test Class A (no buffer)
        reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(abc_class="A", name="Class A Ingredient")
        )
        reorder_engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5.00"))
        reorder_engine.calculate_max_order = AsyncMock(return_value=Decimal("190.00"))
        
        qty_a = await reorder_engine.suggest_reorder_quantity(
            ingredient_id=1001,
            lead_demand=Decimal("10.00"),
            shelf_demand=Decimal("15.00"),
            total_demand=Decimal("25.00"),
            unit="lb",
            lead_time=3,
        )
        
        # Test Class C (50% buffer, 2x MOQ)
        reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(abc_class="C", name="Class C Ingredient")
        )
        
        qty_c = await reorder_engine.suggest_reorder_quantity(
            ingredient_id=1003,
            lead_demand=Decimal("10.00"),
            shelf_demand=Decimal("15.00"),
            total_demand=Decimal("25.00"),
            unit="lb",
            lead_time=3,
        )
        
        # Class C should order more than Class A for same demand
        assert qty_c > qty_a
