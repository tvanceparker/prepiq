"""
Unit tests for EODService.

Tests individual EOD stages, sales aggregation, inventory deduction, and PO generation.
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch, ANY

from app.db.models.inventory_lot_orm import LotStatus
from app.services.eod_service import EODService
from app.services.utils.purchase_order_note_helper import parse_purchase_order_notes


class TestEODServiceUnit:
    """Unit tests for individual EODService methods."""

    @pytest.mark.asyncio
    async def test_aggregate_daily_sales_with_ingredients(
        self, mock_db_session, restaurant_id, sample_sales_data
    ):
        """Test sales aggregation with ingredient-based recipes."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
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
        
        result = await service.aggregate_daily_sales(date(2025, 11, 20))
        
        assert len(result) >= 1
        assert any(item["ingredient_id"] == 1001 for item in result)
        # 10 sold * 0.25 lb each = 2.5 lb
        ingredient_usage = next(item for item in result if item.get("ingredient_id") == 1001)
        assert ingredient_usage["quantity"] == 2.5

    @pytest.mark.asyncio
    async def test_aggregate_daily_sales_with_batches(
        self, mock_db_session, restaurant_id, sample_sales_data
    ):
        """Test sales aggregation with batch recipes."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        service.sales_repo.get_by_date = AsyncMock(return_value=sample_sales_data[:1])
        service.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[
            MagicMock(recipe_id=301)
        ])
        service.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(return_value=[
            MagicMock(
                ingredient_type="batch",
                reference_id=5001,
                quantity_used=Decimal("2.00")
            )
        ])
        service.batch_recipe_repo.get_by_id = AsyncMock(return_value=MagicMock(
            yield_unit="count"
        ))
        
        result = await service.aggregate_daily_sales(date(2025, 11, 20))
        
        assert len(result) >= 1
        assert any(item.get("batch_recipe_id") == 5001 for item in result)
        # 10 sold * 2.0 count each = 20.0
        batch_usage = next(item for item in result if item.get("batch_recipe_id") == 5001)
        assert batch_usage["quantity"] == 20.0

    @pytest.mark.asyncio
    async def test_aggregate_daily_sales_expands_nested_recipe_references(
        self, mock_db_session, restaurant_id, sample_sales_data
    ):
        service = EODService(mock_db_session, restaurant_id, "master")

        service.sales_repo.get_by_date = AsyncMock(return_value=sample_sales_data[:1])
        service.menu_item_recipe_repo.get_by_menu_item = AsyncMock(
            return_value=[MagicMock(recipe_id=301)]
        )

        async def get_recipe_components(recipe_id):
            if recipe_id == 301:
                return [
                    MagicMock(
                        ingredient_type="recipe",
                        reference_id=302,
                        quantity_used=Decimal("2.0"),
                    )
                ]
            if recipe_id == 302:
                return [
                    MagicMock(
                        ingredient_type="ingredient",
                        reference_id=1001,
                        quantity_used=Decimal("0.25"),
                    ),
                    MagicMock(
                        ingredient_type="batch",
                        reference_id=5001,
                        quantity_used=Decimal("1.5"),
                    ),
                ]
            return []

        service.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
            side_effect=get_recipe_components
        )
        service.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(unit="lb")
        )
        service.batch_recipe_repo.get_by_id = AsyncMock(
            return_value=MagicMock(yield_unit="count")
        )

        result = await service.aggregate_daily_sales(date(2025, 11, 20))

        ingredient_usage = next(item for item in result if item.get("ingredient_id") == 1001)
        batch_usage = next(item for item in result if item.get("batch_recipe_id") == 5001)

        assert ingredient_usage["quantity"] == Decimal("5.00")
        assert batch_usage["quantity"] == Decimal("30.00")
        assert ingredient_usage["forecast_date"] == date(2025, 11, 20)
        assert batch_usage["forecast_date"] == date(2025, 11, 20)

    @pytest.mark.asyncio
    async def test_aggregate_daily_sales_no_sales(
        self, mock_db_session, restaurant_id
    ):
        """Test sales aggregation when no sales data exists."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        service.sales_repo.get_by_date = AsyncMock(return_value=[])
        
        result = await service.aggregate_daily_sales(date(2025, 11, 20))
        
        assert result == []

    @pytest.mark.asyncio
    async def test_deduct_ingredients_from_inventory_ingredient_source(
        self, mock_db_session, restaurant_id, sample_inventory
    ):
        """Test inventory deduction for ingredient-based usage."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        usage_summary = [
            {
                "ingredient_id": 1001,
                "forecast_date": date(2025, 11, 20),
                "quantity": 5.0,
                "unit": "lb",
                "source": "sale",
            }
        ]
        
        helper_return = {
            "deducted_items": [
                {
                    "ingredient_id": 1001,
                    "quantity_deducted": 5.0,
                    "unit": "lb",
                    "source": "sale",
                }
            ],
            "failures": [],
        }
        service.inventory_helper.deduct_usage_summary = AsyncMock(return_value=helper_return)

        result = await service.deduct_ingredients_from_inventory(
            usage_summary, date(2025, 11, 20)
        )

        assert result["message"] == "Inventory successfully deducted for sales."
        assert len(result["deducted_items"]) == 1
        assert result["deducted_items"][0]["ingredient_id"] == 1001
        service.inventory_helper.deduct_usage_summary.assert_awaited_once_with(
            usage_summary,
            reference_type="eod_sales",
            reference_id=20251120,
        )

    @pytest.mark.asyncio
    async def test_deduct_ingredients_from_inventory_batch_source(
        self, mock_db_session, restaurant_id, sample_inventory
    ):
        """Test inventory deduction for batch-based usage."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        usage_summary = [
            {
                "batch_recipe_id": 5001,
                "forecast_date": date(2025, 11, 20),
                "quantity": 10.0,
                "unit": "count",
                "source": "batch",
            }
        ]
        
        helper_return = {
            "deducted_items": [
                {
                    "batch_recipe_id": 5001,
                    "inventory_id": 2001,
                    "quantity_deducted": 10.0,
                    "unit": "count",
                    "source": "batch",
                }
            ],
            "failures": [],
        }
        service.inventory_helper.deduct_usage_summary = AsyncMock(return_value=helper_return)

        result = await service.deduct_ingredients_from_inventory(
            usage_summary, date(2025, 11, 20)
        )

        assert len(result["deducted_items"]) == 1
        assert result["deducted_items"][0]["batch_recipe_id"] == 5001
        service.inventory_helper.deduct_usage_summary.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_deduct_ingredients_handles_no_usage(self, mock_db_session, restaurant_id):
        """Ensure deduction helper handles empty summaries gracefully."""
        service = EODService(mock_db_session, restaurant_id, "master")

        result = await service.deduct_ingredients_from_inventory(
            [], date(2025, 11, 20)
        )

        assert result["updated_inventories_count"] == 0
        assert result["deducted_items"] == []

    @pytest.mark.asyncio
    async def test_auto_deduct_spoilage_placeholder(
        self, mock_db_session, restaurant_id
    ):
        """Test spoilage deduction placeholder logs execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.inventory_lot_repo.get_expired_available_lots = AsyncMock(return_value=[])
        
        # Should not raise
        await service.auto_deduct_spoilage(date(2025, 11, 20))

    @pytest.mark.asyncio
    async def test_auto_deduct_spoilage_skips_already_logged_lot(
        self, mock_db_session, restaurant_id
    ):
        """A rerun should not decrement inventory twice for a lot already written off."""
        service = EODService(mock_db_session, restaurant_id, "master")

        expired_lot = MagicMock(
            lot_id=55,
            status="available",
            inventory_id=901,
            ingredient_id=1001,
            unit="lb",
        )
        service.inventory_lot_repo.get_expired_available_lots = AsyncMock(return_value=[expired_lot])
        service.inventory_usage_log_repo.has_usage_type_for_lot = AsyncMock(return_value=True)
        service.inventory_lot_repo.update = AsyncMock()
        service.inventory_repo.decrement_quantity = AsyncMock()
        service.inventory_usage_log_repo.create = AsyncMock()

        await service.auto_deduct_spoilage(date(2025, 11, 20))

        service.inventory_repo.decrement_quantity.assert_not_awaited()
        service.inventory_usage_log_repo.create.assert_not_awaited()
        service.inventory_lot_repo.update.assert_awaited_once_with(
            55,
            {"status": LotStatus.expired},
        )

    @pytest.mark.asyncio
    async def test_generate_forecast_calls_forecasting_engine(
        self, mock_db_session, restaurant_id, mock_forecasting_engine
    ):
        """Test forecast generation delegates to forecasting engine."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.forecasting_engine = mock_forecasting_engine
        
        result = await service.generate_forecast(
            forecast_date=date(2025, 11, 20),
            forecast_horizon_days=30,
            reorder_horizon_days=30,
        )
        
        mock_forecasting_engine.initialize.assert_called_once()
        mock_forecasting_engine.run_forecasting_pipeline.assert_called_once_with(
            forecast_date=date(2025, 11, 20),
            horizon_days=30,
            reorder_horizon_days=30,
        )
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders(
        self, mock_db_session, restaurant_id, sample_suppliers, sample_inventory
    ):
        """Test PO suggestion generation from ingredient forecast."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()
        run_date = date(2025, 11, 20)
        
        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("30.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (run_date + timedelta(days=i), Decimal("1.00"))
                    for i in range(10)
                ],
            }
        }
        
        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=sample_inventory[0]
        )
        service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Test Ingredient"))
        service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Supplier 501"))
        service.reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": sample_suppliers[0],
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        service.reorder_engine.build_reorder_decision = AsyncMock(
            return_value={
                "current_stock": Decimal("100.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("3.00"),
                "shelf_demand": Decimal("7.00"),
                "total_demand": Decimal("10.00"),
                "safety_stock": Decimal("1.00"),
                "reorder_point": Decimal("4.00"),
                "reorder_target": Decimal("11.00"),
                "raw_order_quantity": Decimal("25.00"),
                "buffered_quantity": Decimal("25.00"),
                "moq": Decimal("5.00"),
                "moq_floor": Decimal("5.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("25.00"),
                "should_reorder": True,
                "service_level_z": Decimal("1.65"),
                "abc_class": "B",
                "abc_multiplier": Decimal("1.1"),
                "abc_defaulted": False,
            }
        )
        service.reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "ok"})
        
        result = await service.generate_suggested_purchase_orders(
            ingredient_forecast,
            run_date=run_date,
        )
        
        assert len(result) >= 1
        assert result[0]["ingredient_id"] == 1001
        assert result[0]["supplier_id"] == 501
        assert "suggested_packs_to_order" in result[0]
        service.po_suggestion_repo.replace_for_run_date.assert_awaited_once_with(
            run_date,
            result,
        )

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders_uses_run_date_not_today(
        self, mock_db_session, restaurant_id, sample_suppliers, sample_inventory
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()
        run_date = date(2025, 11, 20)

        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("30.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (run_date + timedelta(days=i), Decimal("2.00"))
                    for i in range(5)
                ],
            }
        }

        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=sample_inventory[0]
        )
        service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Test Ingredient"))
        service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Supplier 501"))
        service.reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": sample_suppliers[0],
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        service.reorder_engine.build_reorder_decision = AsyncMock(
            return_value={
                "current_stock": Decimal("100.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("6.00"),
                "shelf_demand": Decimal("4.00"),
                "total_demand": Decimal("10.00"),
                "safety_stock": Decimal("1.00"),
                "reorder_point": Decimal("7.00"),
                "reorder_target": Decimal("11.00"),
                "raw_order_quantity": Decimal("25.00"),
                "buffered_quantity": Decimal("25.00"),
                "moq": Decimal("5.00"),
                "moq_floor": Decimal("5.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("25.00"),
                "should_reorder": True,
                "service_level_z": Decimal("1.65"),
                "abc_class": "B",
                "abc_multiplier": Decimal("1.1"),
                "abc_defaulted": False,
            }
        )
        service.reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "ok"})

        with patch('app.services.eod_service.date') as mock_date:
            mock_date.today.return_value = date(2026, 1, 15)
            mock_date.side_effect = lambda *args, **kwargs: date(*args, **kwargs)

            result = await service.generate_suggested_purchase_orders(
                ingredient_forecast,
                run_date=run_date,
            )

        assert len(result) == 1
        assert result[0]["lead_demand"] == 6.0
        assert result[0]["shelf_demand"] == 4.0

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders_skip_zero_qty(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        """Test PO generation skips ingredients with zero reorder quantity."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()
        
        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("5.00"),
                "unit": "lb",
                "daily_breakdown": [],
            }
        }
        
        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(quantity_on_hand=Decimal("5.00"), shelf_life_days=7, unit="lb")
        )
        service.reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": sample_suppliers[0],
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        service.reorder_engine.build_reorder_decision = AsyncMock(
            return_value={
                "current_stock": Decimal("5.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("0.00"),
                "shelf_demand": Decimal("0.00"),
                "total_demand": Decimal("0.00"),
                "safety_stock": Decimal("0.00"),
                "reorder_point": Decimal("0.00"),
                "reorder_target": Decimal("0.00"),
                "raw_order_quantity": Decimal("0.00"),
                "buffered_quantity": Decimal("0.00"),
                "moq": Decimal("0.00"),
                "moq_floor": Decimal("0.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("0.00"),
                "should_reorder": False,
                "service_level_z": Decimal("1.65"),
                "abc_class": "B",
                "abc_multiplier": Decimal("1.1"),
                "abc_defaulted": False,
            }
        )
        
        result = await service.generate_suggested_purchase_orders(ingredient_forecast)
        
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders_passes_decimal_zero_demands(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()

        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("5.00"),
                "unit": "lb",
                "daily_breakdown": [],
            }
        }

        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[sample_suppliers[0]]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(quantity_on_hand=Decimal("5.00"), shelf_life_days=7, unit="lb")
        )
        service.reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": sample_suppliers[0],
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )

        captured_call = {}

        async def capture_build_reorder_decision(**kwargs):
            captured_call.update(kwargs)
            return {
                "current_stock": Decimal("5.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("0.00"),
                "shelf_demand": Decimal("0.00"),
                "total_demand": Decimal("0.00"),
                "safety_stock": Decimal("0.00"),
                "reorder_point": Decimal("0.00"),
                "reorder_target": Decimal("0.00"),
                "raw_order_quantity": Decimal("0.00"),
                "buffered_quantity": Decimal("0.00"),
                "moq": Decimal("0.00"),
                "moq_floor": Decimal("0.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("0.00"),
                "should_reorder": False,
                "service_level_z": Decimal("1.65"),
                "abc_class": "B",
                "abc_multiplier": Decimal("1.1"),
                "abc_defaulted": False,
            }

        service.reorder_engine.build_reorder_decision = AsyncMock(
            side_effect=capture_build_reorder_decision
        )

        result = await service.generate_suggested_purchase_orders(ingredient_forecast)

        assert result == []
    assert captured_call["daily_forecast"] == []
    assert captured_call["lead_time"] == sample_suppliers[0].lead_time_days
    assert captured_call["shelf_life_days"] == 7

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders_falls_back_to_supplier_shelf_life(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        run_date = date(2025, 11, 20)

        supplier = sample_suppliers[0]
        supplier.shelf_life_days = 7
        service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(
            return_value=[supplier]
        )
        service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
            return_value=MagicMock(
                quantity_on_hand=Decimal("5.00"),
                unit="lb",
                shelf_life_days=None,
            )
        )
        service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Test Ingredient"))
        service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Supplier 501"))
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()

        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("30.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (run_date + timedelta(days=i), Decimal("1.00"))
                    for i in range(10)
                ],
            }
        }

        service.reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": supplier,
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        service.reorder_engine.build_reorder_decision = AsyncMock(
            return_value={
                "current_stock": Decimal("5.00"),
                "current_unit": "lb",
                "lead_demand": Decimal("3.00"),
                "shelf_demand": Decimal("7.00"),
                "total_demand": Decimal("10.00"),
                "safety_stock": Decimal("1.00"),
                "reorder_point": Decimal("4.00"),
                "reorder_target": Decimal("11.00"),
                "raw_order_quantity": Decimal("6.00"),
                "buffered_quantity": Decimal("6.60"),
                "moq": Decimal("5.00"),
                "moq_floor": Decimal("5.00"),
                "max_allowed": Decimal("100.00"),
                "final_quantity": Decimal("6.60"),
                "should_reorder": True,
                "service_level_z": Decimal("1.65"),
                "abc_class": "B",
                "abc_multiplier": Decimal("1.1"),
                "abc_defaulted": False,
            }
        )
        service.reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "ok"})

        await service.generate_suggested_purchase_orders(
            ingredient_forecast,
            run_date=run_date,
        )

        explanation_kwargs = service.reorder_engine.build_explanation_payload.call_args.kwargs
        assert explanation_kwargs["assumption_flags"]["shelf_life_source"] == "supplier"

    @pytest.mark.asyncio
    async def test_write_purchase_orders_to_db(
        self, mock_db_session, restaurant_id
    ):
        """Test writing purchase orders to database."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.po_suggestion_repo.mark_written_for_supplier = AsyncMock()
        
        service.purchase_order_suggestions = [
            {
                "ingredient_id": 1001,
                "ingredient_supplier_id": 3001,
                "supplier_id": 501,
                "lead_demand": 15.0,
                "shelf_demand": 20.0,
                "total_quantity_ordered": 50.0,
                "supplier_unit": "lb",
                "lead_time_days": 3,
            },
            {
                "ingredient_id": 1002,
                "ingredient_supplier_id": 3002,
                "supplier_id": 501,  # Same supplier
                "lead_demand": 10.0,
                "shelf_demand": 15.0,
                "total_quantity_ordered": 25.0,
                "supplier_unit": "head",
                "lead_time_days": 3,
            }
        ]
        
        mock_order = MagicMock(order_id=7001)
        service.purchase_order_repo.create = AsyncMock(return_value=mock_order)
        service.purchase_order_repo.get_existing_eod_auto_order = AsyncMock(return_value=None)
        service.purchase_order_item_repo.create = AsyncMock()
        service.ingredient_supplier_repo.get_price_per_unit = AsyncMock(return_value=Decimal("4.50"))
        service.purchase_order_repo.update = AsyncMock()
        
        await service.write_purchase_orders_to_db(run_date=date(2025, 11, 20))
        
        # Should create one order (grouped by supplier)
        service.purchase_order_repo.create.assert_called_once()
        create_payload = service.purchase_order_repo.create.await_args.args[0]
        assert create_payload["order_date"] == date(2025, 11, 20)
        assert create_payload["status"] == "cart"
        parsed_notes = parse_purchase_order_notes(create_payload["notes"])
        assert parsed_notes["system_note"] is not None
        assert "[EOD_AUTO run_date=2025-11-20 supplier_id=501]" in parsed_notes["system_note"]
        assert parsed_notes["review_context"]["source_type"] == "eod_auto"
        assert len(parsed_notes["review_context"]["explanation_items"]) == 2
        # Should create two items
        assert service.purchase_order_item_repo.create.call_count == 2
        # Should update order with total price
        service.purchase_order_repo.update.assert_called_once()

    @pytest.mark.asyncio
    async def test_write_purchase_orders_no_suggestions(
        self, mock_db_session, restaurant_id
    ):
        """Test writing POs when no suggestions exist."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.purchase_order_suggestions = []
        service.purchase_order_repo.create = AsyncMock()
        
        await service.write_purchase_orders_to_db(run_date=date(2025, 11, 20))
        
        service.purchase_order_repo.create.assert_not_called()

    @pytest.mark.asyncio
    async def test_write_purchase_orders_to_db_skips_existing_eod_auto_order(
        self, mock_db_session, restaurant_id
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.po_suggestion_repo.mark_written_for_supplier = AsyncMock()

        service.purchase_order_suggestions = [
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

        service.purchase_order_repo.get_existing_eod_auto_order = AsyncMock(
            return_value=MagicMock(order_id=7001)
        )
        service.purchase_order_repo.create = AsyncMock()
        service.purchase_order_item_repo.create = AsyncMock()
        service.purchase_order_repo.update = AsyncMock()

        await service.write_purchase_orders_to_db(run_date=date(2025, 11, 20))

        service.purchase_order_repo.create.assert_not_called()
        service.purchase_order_item_repo.create.assert_not_called()
        service.purchase_order_repo.update.assert_not_called()

    @pytest.mark.asyncio
    async def test_check_sales_data_exists(
        self, mock_db_session, restaurant_id
    ):
        """Test sales data existence check."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.sales_repo.sales_exist_for_dates = AsyncMock(return_value=True)
        
        result = await service.check_sales_data_exists(date(2025, 11, 20))
        
        assert result is True
        service.sales_repo.sales_exist_for_dates.assert_called_once_with([date(2025, 11, 20)])


class TestEODServiceStages:
    """Tests for EOD service staged execution methods."""

    @pytest.mark.asyncio
    async def test_stage_sales_deduction_success(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        """Test sales deduction stage execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.aggregate_daily_sales = AsyncMock(return_value=[{"ingredient_id": 1001}])
        service.deduct_ingredients_from_inventory = AsyncMock()
        service._is_real_time_deduction_enabled = AsyncMock(return_value=False)
        
        ledger = sample_eod_ledger
        result = await service._stage_sales_deduction(date(2025, 11, 20), ledger)
        
        assert result == 1
        service.ledger_repo.mark_stage_complete.assert_called_once()

    @pytest.mark.asyncio
    async def test_stage_sales_deduction_skip_when_complete(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        """Test sales deduction stage skips when already complete."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.aggregate_daily_sales = AsyncMock()
        service._is_real_time_deduction_enabled = AsyncMock(return_value=False)
        
        ledger = sample_eod_ledger
        ledger.sales_deducted = True
        
        result = await service._stage_sales_deduction(date(2025, 11, 20), ledger)
        
        assert result == 0
        service.aggregate_daily_sales.assert_not_called()

    @pytest.mark.asyncio
    async def test_stage_sales_deduction_skips_real_time_mode(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.aggregate_daily_sales = AsyncMock()
        service._is_real_time_deduction_enabled = AsyncMock(return_value=True)
        service.ledger_repo.mark_stage_complete = AsyncMock()

        ledger = sample_eod_ledger

        result = await service._stage_sales_deduction(date(2025, 11, 20), ledger)

        assert result == 0
        service.aggregate_daily_sales.assert_not_called()
        service.ledger_repo.mark_stage_complete.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_stage_forecast_success(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        """Test forecast stage execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.generate_forecast = AsyncMock(return_value={1001: {"unit": "lb"}})
        
        ledger = sample_eod_ledger
        result = await service._stage_forecast(date(2025, 11, 20), ledger, 30, 30)
        
        assert 1001 in result
        service.ledger_repo.mark_stage_complete.assert_called_once()

    @pytest.mark.asyncio
    async def test_stage_reorder_success(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        """Test reorder stage execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.reorder_engine.classify_all_ingredients = AsyncMock()
        service.generate_suggested_purchase_orders = AsyncMock(return_value=[{"ingredient_id": 1001}])
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()
        
        ledger = sample_eod_ledger
        ingredient_forecast = {1001: {"unit": "lb"}}
        
        result = await service._stage_reorder(
            date(2025, 11, 20),
            ledger,
            ingredient_forecast,
            30,
        )
        
        assert result == 1
        assert len(service._purchase_order_suggestions) == 1
        service.po_suggestion_repo.replace_for_run_date.assert_awaited_once_with(
            date(2025, 11, 20),
            [{"ingredient_id": 1001}],
        )

    @pytest.mark.asyncio
    async def test_recover_ingredient_forecast_from_breakdowns(
        self, mock_db_session, restaurant_id
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        run_date = date(2025, 11, 20)

        service.forecasting_engine.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(
            return_value=[
                MagicMock(
                    menu_item_id=101,
                    forecast_date=run_date,
                    forecasted_quantity=3,
                ),
                MagicMock(
                    menu_item_id=101,
                    forecast_date=run_date + timedelta(days=1),
                    forecasted_quantity=2,
                ),
            ]
        )
        service.forecasting_engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(
            return_value=[]
        )
        service.forecasting_engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(
            return_value=[301]
        )
        service.forecasting_engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
            return_value=[
                MagicMock(
                    ingredient_type="ingredient",
                    reference_id=1001,
                    quantity_used=Decimal("0.50"),
                )
            ]
        )
        service.forecasting_engine.ingredient_repo.get_by_id = AsyncMock(
            return_value=MagicMock(unit="lb")
        )

        result = await service._recover_ingredient_forecast_from_breakdowns(
            run_date,
            30,
        )

        assert list(result.keys()) == [1001]
        assert result[1001]["unit"] == "lb"
        assert result[1001]["total_quantity"] == Decimal("2.50")
        assert result[1001]["daily_breakdown"] == [
            (run_date, Decimal("1.50")),
            (run_date + timedelta(days=1), Decimal("1.00")),
        ]

    @pytest.mark.asyncio
    async def test_recover_ingredient_forecast_from_breakdowns_expands_nested_batch_graph(
        self, mock_db_session, restaurant_id
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        run_date = date(2025, 11, 20)

        service.forecasting_engine.forecast_breakdown_repo.get_latest_by_date_range = AsyncMock(
            return_value=[
                MagicMock(
                    menu_item_id=99,
                    forecast_date=run_date,
                    forecasted_quantity=4,
                )
            ]
        )
        service.forecasting_engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(
            return_value=[MagicMock(recipe_id=10)]
        )
        service.forecasting_engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(
            return_value=[10]
        )

        async def get_recipe_components(recipe_id):
            if recipe_id == 10:
                return [
                    MagicMock(
                        ingredient_type="ingredient",
                        reference_id=1001,
                        quantity_used=Decimal("1.0"),
                    ),
                    MagicMock(
                        ingredient_type="recipe",
                        reference_id=20,
                        quantity_used=Decimal("2.0"),
                    ),
                    MagicMock(
                        ingredient_type="batch",
                        reference_id=501,
                        quantity_used=Decimal("3.0"),
                    ),
                ]
            if recipe_id == 20:
                return [
                    MagicMock(
                        ingredient_type="ingredient",
                        reference_id=1002,
                        quantity_used=Decimal("0.5"),
                    ),
                    MagicMock(
                        ingredient_type="batch",
                        reference_id=502,
                        quantity_used=Decimal("1.0"),
                    ),
                ]
            return []

        async def get_batch(batch_recipe_id):
            if batch_recipe_id == 501:
                return MagicMock(
                    batch_recipe_id=501,
                    yield_quantity=Decimal("10.0"),
                    yield_unit="count",
                )
            if batch_recipe_id == 502:
                return MagicMock(
                    batch_recipe_id=502,
                    yield_quantity=Decimal("8.0"),
                    yield_unit="count",
                )
            return MagicMock(
                batch_recipe_id=503,
                yield_quantity=Decimal("5.0"),
                yield_unit="count",
            )

        async def get_batch_components(batch_recipe_id):
            if batch_recipe_id == 501:
                return [
                    MagicMock(
                        ingredient_type="ingredient",
                        reference_id=1003,
                        quantity_used=Decimal("4.0"),
                        unit="count",
                    ),
                    MagicMock(
                        ingredient_type="batch",
                        reference_id=503,
                        quantity_used=Decimal("2.0"),
                        unit="count",
                    ),
                ]
            if batch_recipe_id == 502:
                return [
                    MagicMock(
                        ingredient_type="ingredient",
                        reference_id=1004,
                        quantity_used=Decimal("6.0"),
                        unit="count",
                    )
                ]
            return [
                MagicMock(
                    ingredient_type="ingredient",
                    reference_id=1005,
                    quantity_used=Decimal("10.0"),
                    unit="count",
                )
            ]

        service.forecasting_engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
            side_effect=get_recipe_components
        )
        service.forecasting_engine.batch_recipe_repo.get_by_id = AsyncMock(
            side_effect=get_batch
        )
        service.forecasting_engine.batch_recipe_ingredients_repo.get_by_batch_recipe_id = AsyncMock(
            side_effect=get_batch_components
        )
        service.forecasting_engine.ingredient_repo.get_by_id = AsyncMock(
            side_effect=lambda ingredient_id: MagicMock(unit="count")
        )

        result = await service._recover_ingredient_forecast_from_breakdowns(
            run_date,
            1,
        )

        assert {ingredient_id: data["total_quantity"] for ingredient_id, data in result.items()} == {
            1001: Decimal("4.0"),
            1002: Decimal("4.0"),
            1003: Decimal("4.8"),
            1004: Decimal("6.0"),
            1005: Decimal("4.8"),
        }
        assert result[1005]["daily_breakdown"] == [(run_date, Decimal("4.8"))]

    @pytest.mark.asyncio
    async def test_stage_reorder_recovers_persisted_forecast_after_restart(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.reorder_engine.classify_all_ingredients = AsyncMock()
        service.generate_suggested_purchase_orders = AsyncMock(return_value=[{"ingredient_id": 1001}])
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()
        service._recover_ingredient_forecast_from_breakdowns = AsyncMock(
            return_value={1001: {"unit": "lb", "daily_breakdown": []}}
        )

        ledger = sample_eod_ledger
        ledger.forecast_completed = True

        result = await service._stage_reorder(
            date(2025, 11, 20),
            ledger,
            {},
            30,
        )

        assert result == 1
        service._recover_ingredient_forecast_from_breakdowns.assert_awaited_once_with(
            date(2025, 11, 20),
            30,
        )
        service.generate_suggested_purchase_orders.assert_awaited_once_with(
            {1001: {"unit": "lb", "daily_breakdown": []}},
            run_date=date(2025, 11, 20),
        )
        assert service._purchase_order_suggestions == [{"ingredient_id": 1001}]

    @pytest.mark.asyncio
    async def test_stage_po_write_success(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        """Test PO write stage execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.write_purchase_orders_to_db = AsyncMock()
        service._purchase_order_suggestions = [{"ingredient_id": 1001}]
        service.po_suggestion_repo.list_by_run_date = AsyncMock(return_value=[])
        
        ledger = sample_eod_ledger
        result = await service._stage_po_write(ledger, date(2025, 11, 20), 30)
        
        assert result == 1
        service.write_purchase_orders_to_db.assert_called_once_with(run_date=date(2025, 11, 20))

    @pytest.mark.asyncio
    async def test_stage_po_write_loads_persisted_suggestions_after_restart(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.write_purchase_orders_to_db = AsyncMock()
        service.po_suggestion_repo.list_by_run_date = AsyncMock(
            return_value=[
                MagicMock(
                    ingredient_id=1001,
                    ingredient_supplier_id=3001,
                    supplier_id=501,
                    lead_demand=Decimal("5.00"),
                    shelf_demand=Decimal("10.00"),
                    forecast_unit="lb",
                    converted_quantity_needed=Decimal("12.00"),
                    suggested_packs_to_order=3,
                    total_quantity_ordered=Decimal("15.00"),
                    supplier_unit="lb",
                    inventory_unit="lb",
                    lead_time_days=3,
                    shelf_life_days=5,
                    pack_size=1,
                    quantity_per_pack_item=Decimal("5.00"),
                    min_order_quantity=Decimal("10.00"),
                )
            ]
        )

        ledger = sample_eod_ledger
        ledger.reorder_completed = True

        result = await service._stage_po_write(ledger, date(2025, 11, 20), 30)

        assert result == 1
        service.po_suggestion_repo.list_by_run_date.assert_awaited_once_with(
            date(2025, 11, 20)
        )
        service.write_purchase_orders_to_db.assert_awaited_once_with(
            run_date=date(2025, 11, 20)
        )

    @pytest.mark.asyncio
    async def test_stage_po_write_recovers_suggestions_from_forecast_when_store_empty(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.write_purchase_orders_to_db = AsyncMock()
        service.generate_suggested_purchase_orders = AsyncMock(return_value=[{"ingredient_id": 1001}])
        service.po_suggestion_repo.list_by_run_date = AsyncMock(return_value=[])
        service.po_suggestion_repo.replace_for_run_date = AsyncMock()
        service._recover_ingredient_forecast_from_breakdowns = AsyncMock(
            return_value={1001: {"unit": "lb", "daily_breakdown": []}}
        )

        ledger = sample_eod_ledger
        ledger.reorder_completed = True

        result = await service._stage_po_write(ledger, date(2025, 11, 20), 30)

        assert result == 1
        service._recover_ingredient_forecast_from_breakdowns.assert_awaited_once_with(
            date(2025, 11, 20),
            30,
        )
        service.generate_suggested_purchase_orders.assert_awaited_once_with(
            {1001: {"unit": "lb", "daily_breakdown": []}},
            run_date=date(2025, 11, 20),
        )
