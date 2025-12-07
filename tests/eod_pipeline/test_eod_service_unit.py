"""
Unit tests for EODService.

Tests individual EOD stages, sales aggregation, inventory deduction, and PO generation.
"""
import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch, ANY

from app.services.eod_service import EODService


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

        result = await service.deduct_ingredients_from_inventory(usage_summary)

        assert result["message"] == "Inventory successfully deducted for sales."
        assert len(result["deducted_items"]) == 1
        assert result["deducted_items"][0]["ingredient_id"] == 1001
        service.inventory_helper.deduct_usage_summary.assert_awaited_once_with(
            usage_summary,
            reference_type="other",
            reference_id=ANY,
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

        result = await service.deduct_ingredients_from_inventory(usage_summary)

        assert len(result["deducted_items"]) == 1
        assert result["deducted_items"][0]["batch_recipe_id"] == 5001
        service.inventory_helper.deduct_usage_summary.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_deduct_ingredients_handles_no_usage(self, mock_db_session, restaurant_id):
        """Ensure deduction helper handles empty summaries gracefully."""
        service = EODService(mock_db_session, restaurant_id, "master")

        result = await service.deduct_ingredients_from_inventory([])

        assert result["updated_inventories_count"] == 0
        assert result["deducted_items"] == []

    @pytest.mark.asyncio
    async def test_auto_deduct_spoilage_placeholder(
        self, mock_db_session, restaurant_id
    ):
        """Test spoilage deduction placeholder logs execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
        # Should not raise
        await service.auto_deduct_spoilage(date(2025, 11, 20))

    @pytest.mark.asyncio
    async def test_generate_forecast_calls_forecasting_engine(
        self, mock_db_session, restaurant_id, mock_forecasting_engine
    ):
        """Test forecast generation delegates to forecasting engine."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.forecasting_engine = mock_forecasting_engine
        
        result = await service.generate_forecast(
            forecast_horizon_days=30,
            reorder_horizon_days=30
        )
        
        mock_forecasting_engine.initialize.assert_called_once()
        mock_forecasting_engine.run_forecasting_pipeline.assert_called_once_with(
            horizon_days=30,
            reorder_horizon_days=30
        )
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders(
        self, mock_db_session, restaurant_id, sample_suppliers, sample_inventory
    ):
        """Test PO suggestion generation from ingredient forecast."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.reorder_engine.suggest_reorder_quantity = AsyncMock(return_value=Decimal("25.00"))
        
        ingredient_forecast = {
            1001: {
                "total_quantity": Decimal("30.00"),
                "unit": "lb",
                "daily_breakdown": [
                    (date.today() + timedelta(days=i), Decimal("1.00"))
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
        
        result = await service.generate_suggested_purchase_orders(ingredient_forecast)
        
        assert len(result) >= 1
        assert result[0]["ingredient_id"] == 1001
        assert result[0]["supplier_id"] == 501
        assert "suggested_packs_to_order" in result[0]

    @pytest.mark.asyncio
    async def test_generate_suggested_purchase_orders_skip_zero_qty(
        self, mock_db_session, restaurant_id, sample_suppliers
    ):
        """Test PO generation skips ingredients with zero reorder quantity."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.reorder_engine.suggest_reorder_quantity = AsyncMock(return_value=Decimal("0.00"))
        
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
            return_value=MagicMock(shelf_life_days=7, unit="lb")
        )
        
        result = await service.generate_suggested_purchase_orders(ingredient_forecast)
        
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_write_purchase_orders_to_db(
        self, mock_db_session, restaurant_id
    ):
        """Test writing purchase orders to database."""
        service = EODService(mock_db_session, restaurant_id, "master")
        
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
        service.purchase_order_item_repo.create = AsyncMock()
        service.ingredient_supplier_repo.get_price_per_unit = AsyncMock(return_value=Decimal("4.50"))
        service.purchase_order_repo.update = AsyncMock()
        
        await service.write_purchase_orders_to_db()
        
        # Should create one order (grouped by supplier)
        service.purchase_order_repo.create.assert_called_once()
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
        
        await service.write_purchase_orders_to_db()
        
        service.purchase_order_repo.create.assert_not_called()

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
        
        ledger = sample_eod_ledger
        ingredient_forecast = {1001: {"unit": "lb"}}
        
        result = await service._stage_reorder(ledger, ingredient_forecast)
        
        assert result == 1
        assert len(service._purchase_order_suggestions) == 1

    @pytest.mark.asyncio
    async def test_stage_po_write_success(
        self, mock_db_session, restaurant_id, sample_eod_ledger
    ):
        """Test PO write stage execution."""
        service = EODService(mock_db_session, restaurant_id, "master")
        service.ledger_repo.mark_stage_complete = AsyncMock()
        service.write_purchase_orders_to_db = AsyncMock()
        service._purchase_order_suggestions = [{"ingredient_id": 1001}]
        
        ledger = sample_eod_ledger
        result = await service._stage_po_write(ledger)
        
        assert result == 1
        service.write_purchase_orders_to_db.assert_called_once()
