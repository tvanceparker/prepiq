"""
Integration tests for EOD Pipeline.

Tests interactions between services (EODService + ForecastingEngine + ReorderEngine).
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.eod_service import EODService
from app.services.forecasting_engine import ForecastingEngine
from app.services.reorder_forecast_engine import ReorderForecastEngine
from app.services.inventory_stats_service import InventoryStatsService


class TestEODPipelineIntegration:
    """Integration tests for service interactions."""

    @pytest.mark.asyncio
    async def test_stage_reorder_bootstraps_policy_before_reorder(
        self,
        mock_db_session,
        restaurant_id,
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        ledger = SimpleNamespace(reorder_completed=False, forecast_completed=True)
        ingredient_forecast = {
            1001: {
                "daily_breakdown": [
                    (date(2026, 4, 15) + timedelta(days=index), Decimal("1.00"))
                    for index in range(5)
                ]
            }
        }
        call_order = []

        async def bootstrap_missing_policy_config(*, ingredient_forecast, as_of_date):
            call_order.append("bootstrap")
            return {
                "updated_count": 1,
                "skipped_count": 0,
                "failed_count": 0,
                "updated_ingredient_ids": [1001],
                "failed_items": [],
            }

        async def classify_all_ingredients():
            call_order.append("classify")

        async def generate_suggested_purchase_orders(ingredient_forecast, run_date=None):
            call_order.append("generate")
            return [{"ingredient_id": 1001}]

        async def persist_purchase_order_suggestions(run_date, suggestions):
            call_order.append("persist")

        service.reorder_engine.bootstrap_missing_policy_config = AsyncMock(
            side_effect=bootstrap_missing_policy_config
        )
        service.reorder_engine.classify_all_ingredients = AsyncMock(
            side_effect=classify_all_ingredients
        )
        service.generate_suggested_purchase_orders = AsyncMock(
            side_effect=generate_suggested_purchase_orders
        )
        service._persist_purchase_order_suggestions = AsyncMock(
            side_effect=persist_purchase_order_suggestions
        )
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.ledger_repo.append_error = AsyncMock()

        result = await service._stage_reorder(
            run_date=date(2026, 4, 15),
            ledger=ledger,
            ingredient_forecast=ingredient_forecast,
            reorder_horizon_days=30,
        )

        service.reorder_engine.bootstrap_missing_policy_config.assert_awaited_once_with(
            ingredient_forecast=ingredient_forecast,
            as_of_date=date(2026, 4, 15),
        )
        assert call_order[:3] == ["bootstrap", "classify", "generate"]
        assert result == 1

    @pytest.mark.asyncio
    async def test_stage_reorder_records_policy_bootstrap_failures_and_continues(
        self,
        mock_db_session,
        restaurant_id,
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        ledger = SimpleNamespace(reorder_completed=False, forecast_completed=True)
        ingredient_forecast = {
            1002: {
                "daily_breakdown": [
                    (date(2026, 4, 15) + timedelta(days=index), Decimal("0.50"))
                    for index in range(3)
                ]
            }
        }

        service.reorder_engine.bootstrap_missing_policy_config = AsyncMock(
            return_value={
                "updated_count": 0,
                "skipped_count": 0,
                "failed_count": 1,
                "updated_ingredient_ids": [],
                "failed_items": [
                    {"ingredient_id": 1002, "reason": "unable to infer bootstrap policy"}
                ],
            }
        )
        service.reorder_engine.classify_all_ingredients = AsyncMock()
        service.generate_suggested_purchase_orders = AsyncMock(return_value=[])
        service._persist_purchase_order_suggestions = AsyncMock()
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.ledger_repo.append_error = AsyncMock()

        result = await service._stage_reorder(
            run_date=date(2026, 4, 15),
            ledger=ledger,
            ingredient_forecast=ingredient_forecast,
            reorder_horizon_days=30,
        )

        service.ledger_repo.append_error.assert_awaited_once()
        append_args = service.ledger_repo.append_error.await_args.args
        assert append_args[1] == "policy_bootstrap"
        assert "ingredient 1002" in append_args[2]
        service.reorder_engine.classify_all_ingredients.assert_awaited_once()
        service.generate_suggested_purchase_orders.assert_awaited_once()
        assert result == 0

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
            forecast_date=date.today(),
            forecast_horizon_days=30,
            reorder_horizon_days=30,
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
        eod_service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Primary Supplier"))
        eod_service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Test Ingredient"))
        eod_service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(
                quantity_on_hand=Decimal("20.00"),
                shelf_life_days=7,
                unit="lb"
            )
        )
        eod_service.reorder_engine.build_reorder_decision = AsyncMock(
            return_value={
                "current_stock": Decimal("20.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("4.50"),
                "shelf_demand": Decimal("0.00"),
                "total_demand": Decimal("4.50"),
                "safety_stock": Decimal("5.00"),
                "reorder_point": Decimal("9.50"),
                "reorder_target": Decimal("9.50"),
                "raw_order_quantity": Decimal("10.00"),
                "buffered_quantity": Decimal("10.00"),
                "moq": Decimal("1.00"),
                "moq_floor": Decimal("1.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("10.00"),
                "should_reorder": True,
                "service_level_z": Decimal("1.65"),
                "abc_class": "A",
                "abc_multiplier": Decimal("1.0"),
                "abc_defaulted": False,
            }
        )
        eod_service.reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "ok"})
        
        # Generate PO suggestions
        result = await eod_service.generate_suggested_purchase_orders(ingredient_forecast)
        
        eod_service.reorder_engine.build_reorder_decision.assert_awaited_once()
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
        stats_service.get_max_stock_level = AsyncMock(return_value=Decimal("100.00"))
        stats_service.get_usable_inventory = AsyncMock(
            return_value={
                "quantity": Decimal("4.00"),
                "unit": "lb",
                "total_quantity": Decimal("4.00"),
                "excluded_quantity": Decimal("0.00"),
                "source": "inventory_summary",
                "conversion_fallback": False,
            }
        )
        reorder_engine.alert_repo = AsyncMock()
        reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(
                abc_class="A",
                name="Test Ingredient",
                policy_type="stable_stocked",
                policy_assignment_mode="manual",
                target_service_level=0.95,
            )
        )
        daily_forecast = [
            (date(2026, 4, 15) + timedelta(days=i), Decimal("2.50"))
            for i in range(3)
        ]
        
        # Calculate safety stock using integrated services
        safety_stock = await reorder_engine.calculate_safety_stock(
            ingredient_id=1001,
            lead_time=3,
            service_level_z=Decimal("1.65"),
        )
        
        decision = await reorder_engine.build_reorder_decision(
            ingredient_id=1001,
            unit="lb",
            lead_time=3,
            daily_forecast=daily_forecast,
            supplier=None,
            as_of_date=date(2026, 4, 15),
            shelf_life_days=7,
            current_stock=Decimal("4.00"),
            current_unit="lb",
            moq=Decimal("5.00"),
            manage_alerts=False,
        )
        
        # Verify calculations
        assert safety_stock > Decimal("0")
        assert decision["reorder_point"] > safety_stock

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
        result = await service.deduct_ingredients_from_inventory(
            usage_summary, date(2025, 11, 20)
        )
        
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
        service.purchase_order_repo.get_existing_eod_auto_order = AsyncMock(return_value=None)
        service.po_suggestion_repo.mark_written_for_supplier = AsyncMock()
        service.purchase_order_repo.update = AsyncMock()
        
        # Write to database
        await service.write_purchase_orders_to_db()
        
        # Verify integration
        service.purchase_order_repo.create.assert_called_once()
        create_payload = service.purchase_order_repo.create.await_args.args[0]
        assert create_payload["status"] == "cart"
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
        
        ingredient_forecast = await service.generate_forecast(
            forecast_date=date.today(),
            forecast_horizon_days=30,
            reorder_horizon_days=30,
        )
        
        # Step 2: Generate reorder suggestions
        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        service.supplier_repo.get_by_id = AsyncMock(
            return_value=SimpleNamespace(name="Primary Supplier")
        )
        service.ingredient_repo.get_by_id = AsyncMock(
            return_value=SimpleNamespace(name="Test Ingredient")
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(quantity_on_hand=Decimal("15.00"), shelf_life_days=7, unit="lb")
        )
        service.reorder_engine.build_reorder_decision = AsyncMock(
            return_value={
                "current_stock": Decimal("15.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("15.00"),
                "shelf_demand": Decimal("0.00"),
                "total_demand": Decimal("15.00"),
                "safety_stock": Decimal("5.00"),
                "reorder_point": Decimal("20.00"),
                "reorder_target": Decimal("20.00"),
                "raw_order_quantity": Decimal("15.00"),
                "buffered_quantity": Decimal("15.00"),
                "moq": Decimal("1.00"),
                "moq_floor": Decimal("1.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("15.00"),
                "should_reorder": True,
                "service_level_z": Decimal("1.65"),
                "abc_class": "A",
                "abc_multiplier": Decimal("1.0"),
                "abc_defaulted": False,
            }
        )
        service.reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "ok"})
        
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
        service.purchase_order_repo.get_existing_eod_auto_order = AsyncMock(return_value=None)
        service.po_suggestion_repo.mark_written_for_supplier = AsyncMock()
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
        """Test ABC classification remains visible without hardcoded quantity buffers."""
        reorder_engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        reorder_engine.stats_service = mock_inventory_stats
        reorder_engine.alert_repo = AsyncMock()
        
        mock_inventory_stats.get_average_daily_usage.return_value = Decimal("2.00")
        mock_inventory_stats.get_usable_inventory.return_value = {
            "quantity": Decimal("10.00"),
            "unit": "lb",
            "total_quantity": Decimal("10.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }
        daily_forecast = [
            (date(2026, 4, 15) + timedelta(days=i), Decimal("10.00"))
            for i in range(3)
        ]
        
        # Test Class A
        reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(
                abc_class="A",
                name="Class A Ingredient",
                policy_type="stable_stocked",
                policy_assignment_mode="manual",
                target_service_level=0.95,
            )
        )
        reorder_engine.calculate_safety_stock = AsyncMock(return_value=Decimal("5.00"))
        reorder_engine.calculate_max_order = AsyncMock(return_value=Decimal("190.00"))
        
        decision_a = await reorder_engine.build_reorder_decision(
            ingredient_id=1001,
            unit="lb",
            lead_time=3,
            daily_forecast=daily_forecast,
            supplier=None,
            as_of_date=date(2026, 4, 15),
            shelf_life_days=7,
            current_stock=Decimal("10.00"),
            current_unit="lb",
            moq=Decimal("5.00"),
            manage_alerts=False,
        )
        
        # Test Class C
        reorder_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(
                abc_class="C",
                name="Class C Ingredient",
                policy_type="stable_stocked",
                policy_assignment_mode="manual",
                target_service_level=0.95,
            )
        )
        
        decision_c = await reorder_engine.build_reorder_decision(
            ingredient_id=1003,
            unit="lb",
            lead_time=3,
            daily_forecast=daily_forecast,
            supplier=None,
            as_of_date=date(2026, 4, 15),
            shelf_life_days=7,
            current_stock=Decimal("10.00"),
            current_unit="lb",
            moq=Decimal("5.00"),
            manage_alerts=False,
        )
        
        assert decision_a["abc_class"] == "A"
        assert decision_c["abc_class"] == "C"
        assert decision_c["final_quantity"] == decision_a["final_quantity"]
