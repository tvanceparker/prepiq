"""
Unit tests for ReorderForecastEngine.

Tests reorder calculations, safety stock, ABC classification, and quantity suggestions.
"""
import pytest
import math
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.reorder_forecast_engine import ReorderForecastEngine


class TestReorderForecastEngineUnit:
    """Unit tests for individual ReorderForecastEngine methods."""

    @pytest.mark.asyncio
    async def test_calculate_safety_stock(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test safety stock calculation using Z-score formula."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        
        mock_inventory_stats.get_std_dev_usage.return_value = Decimal("0.50")
        lead_time = 3
        
        result = await engine.calculate_safety_stock(ingredient_id=1001, lead_time=lead_time)
        
        # Z * stddev * sqrt(lead_time) = 1.65 * 0.50 * sqrt(3) ≈ 1.43
        expected = Decimal("1.65") * Decimal("0.50") * Decimal(str(math.sqrt(lead_time)))
        assert abs(result - expected.quantize(Decimal("0.01"))) < Decimal("0.01")

    @pytest.mark.asyncio
    async def test_calculate_safety_stock_zero_stddev(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test safety stock with zero standard deviation."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        
        mock_inventory_stats.get_std_dev_usage.return_value = Decimal("0")
        
        result = await engine.calculate_safety_stock(ingredient_id=1001, lead_time=3)
        
        assert result == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_calculate_reorder_point(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test reorder point calculation (lead demand + safety stock)."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        
        mock_inventory_stats.get_lead_time_days.return_value = 3
        mock_inventory_stats.get_average_daily_usage.return_value = Decimal("2.00")
        mock_inventory_stats.get_std_dev_usage.return_value = Decimal("0.50")
        
        result = await engine.calculate_reorder_point(ingredient_id=1001)
        
        # Lead demand = 2.00 * 3 = 6.00
        # Safety stock = 1.65 * 0.50 * sqrt(3) ≈ 1.43
        # Reorder point ≈ 7.43
        assert result >= Decimal("7.00")
        assert result <= Decimal("8.00")

    @pytest.mark.asyncio
    async def test_calculate_max_order_with_limit(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test max order calculation with defined max stock level."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("100.00")
        current_stock = Decimal("50.00")
        
        result = await engine.calculate_max_order(ingredient_id=1001, current_stock=current_stock)
        
        assert result == Decimal("50.00")  # 100 - 50

    @pytest.mark.asyncio
    async def test_calculate_max_order_no_limit(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test max order calculation without max stock level."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        
        mock_inventory_stats.get_max_stock_level.return_value = None
        
        result = await engine.calculate_max_order(ingredient_id=1001, current_stock=Decimal("50.00"))
        
        assert result == Decimal("Infinity")

    @pytest.mark.asyncio
    async def test_calculate_max_order_at_capacity(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        """Test max order when already at or above max stock."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("100.00")
        current_stock = Decimal("110.00")
        
        result = await engine.calculate_max_order(ingredient_id=1001, current_stock=current_stock)
        
        assert result == Decimal("0")

    @pytest.mark.asyncio
    async def test_suggest_reorder_quantity_class_a(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        """Test reorder quantity suggestion for Class A ingredient."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()
        
        # Setup ingredient as Class A
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("10.00"), "lb")
        mock_inventory_stats.get_moq.return_value = Decimal("5.00")
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("200.00")
        
        lead_demand = Decimal("15.00")
        shelf_demand = Decimal("20.00")
        total_demand = Decimal("35.00")
        safety_stock = Decimal("5.00")
        
        # Mock calculate_safety_stock
        with patch.object(engine, 'calculate_safety_stock', return_value=safety_stock):
            with patch.object(engine, 'calculate_max_order', return_value=Decimal("190.00")):
                result = await engine.suggest_reorder_quantity(
                    ingredient_id=1001,
                    lead_demand=lead_demand,
                    shelf_demand=shelf_demand,
                    total_demand=total_demand,
                    unit="lb",
                    lead_time=3,
                )
        
        # Class A: max(raw_order_qty, moq)
        # raw_order_qty = (lead_demand + shelf_demand + safety) - current = 40 - 10 = 30
        # Result should be max(30, 5) = 30
        assert result == Decimal("30.00")

    @pytest.mark.asyncio
    async def test_suggest_reorder_quantity_class_b(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        """Test reorder quantity suggestion for Class B ingredient (10% buffer)."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()
        
        # Setup ingredient as Class B
        ingredient = sample_ingredients[1]
        ingredient.abc_class = "B"
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("5.00"), "head")
        mock_inventory_stats.get_moq.return_value = Decimal("10.00")
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("100.00")
        
        with patch.object(engine, 'calculate_safety_stock', return_value=Decimal("3.00")):
            with patch.object(engine, 'calculate_max_order', return_value=Decimal("95.00")):
                result = await engine.suggest_reorder_quantity(
                    ingredient_id=1002,
                    lead_demand=Decimal("10.00"),
                    shelf_demand=Decimal("15.00"),
                    total_demand=Decimal("25.00"),
                    unit="head",
                    lead_time=2,
                )
        
        # Class B: max(raw_order_qty * 1.1, moq)
        # raw = (10 + 15 + 3) - 5 = 23
        # Result should be max(23 * 1.1, 10) = 25.30
        assert result == Decimal("25.30")

    @pytest.mark.asyncio
    async def test_suggest_reorder_quantity_class_c(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        """Test reorder quantity suggestion for Class C ingredient (50% buffer, 2x MOQ)."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()
        
        # Setup ingredient as Class C
        ingredient = sample_ingredients[2]
        ingredient.abc_class = "C"
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("3.00"), "lb")
        mock_inventory_stats.get_moq.return_value = Decimal("5.00")
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("80.00")
        
        with patch.object(engine, 'calculate_safety_stock', return_value=Decimal("2.00")):
            with patch.object(engine, 'calculate_max_order', return_value=Decimal("77.00")):
                result = await engine.suggest_reorder_quantity(
                    ingredient_id=1003,
                    lead_demand=Decimal("8.00"),
                    shelf_demand=Decimal("10.00"),
                    total_demand=Decimal("18.00"),
                    unit="lb",
                    lead_time=3,
                )
        
        # Class C: max(raw_order_qty * 1.5, moq * 2)
        # raw = (8 + 10 + 2) - 3 = 17
        # Result should be max(17 * 1.5, 5 * 2) = max(25.5, 10) = 25.50
        assert result == Decimal("25.50")

    @pytest.mark.asyncio
    async def test_suggest_reorder_quantity_above_reorder_point(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        """Test no reorder when current stock is above reorder point."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo.resolve_open_low_stock_alerts = AsyncMock(return_value=1)
        
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("100.00"), "lb")
        
        with patch.object(engine, 'calculate_safety_stock', return_value=Decimal("5.00")):
            result = await engine.suggest_reorder_quantity(
                ingredient_id=1001,
                lead_demand=Decimal("10.00"),
                shelf_demand=Decimal("20.00"),
                total_demand=Decimal("30.00"),
                unit="lb",
                lead_time=3,
            )
        
        # Current (100) > reorder_point (10 + 5 = 15), should return 0
        assert result == Decimal("0.00")
        engine.alert_repo.resolve_open_low_stock_alerts.assert_awaited_once_with(1001)

    @pytest.mark.asyncio
    async def test_suggest_reorder_quantity_creates_alert(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        """Test low stock alert is created when below reorder point."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()
        engine.alert_repo.get_open_low_stock_alert = AsyncMock(return_value=None)
        engine.alert_repo.create = AsyncMock()
        
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        mock_inventory_stats.get_current_inventory.return_value = (Decimal("5.00"), "lb")
        mock_inventory_stats.get_moq.return_value = Decimal("10.00")
        mock_inventory_stats.get_max_stock_level.return_value = Decimal("100.00")
        
        with patch.object(engine, 'calculate_safety_stock', return_value=Decimal("3.00")):
            with patch.object(engine, 'calculate_max_order', return_value=Decimal("95.00")):
                await engine.suggest_reorder_quantity(
                    ingredient_id=1001,
                    lead_demand=Decimal("10.00"),
                    shelf_demand=Decimal("15.00"),
                    total_demand=Decimal("25.00"),
                    unit="lb",
                    lead_time=3,
                )

        engine.alert_repo.create.assert_called_once()
        call_args = engine.alert_repo.create.call_args[0][0]
        assert call_args["alert_type"] == "LowStock"
        assert "Ground Beef" in call_args["message"]

    @pytest.mark.asyncio
    async def test_build_reorder_decision_normalizes_integer_inputs(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.alert_repo = AsyncMock()
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("3.00")):
            with patch.object(engine, "calculate_max_order", return_value=Decimal("95.00")):
                decision = await engine.build_reorder_decision(
                    ingredient_id=1001,
                    lead_demand=0,
                    shelf_demand=0,
                    total_demand=0,
                    unit="lb",
                    lead_time=3,
                    current_stock=5,
                    current_unit="lb",
                    moq=10,
                    manage_alerts=False,
                )

        assert decision["lead_demand"] == Decimal("0.00")
        assert decision["shelf_demand"] == Decimal("0.00")
        assert decision["total_demand"] == Decimal("0.00")
        assert decision["current_stock"] == Decimal("5.00")
        assert decision["moq"] == Decimal("10.00")
        assert decision["reorder_point"] == Decimal("3.00")

    @pytest.mark.asyncio
    async def test_classify_abc_item_cached(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test ABC classification uses cache when available."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine._abc_cache = {1001: "A"}
        engine.ingredient_repo.get_by_id = AsyncMock()
        
        result = await engine.classify_abc_item(ingredient_id=1001)
        
        assert result == "A"
        engine.ingredient_repo.get_by_id.assert_not_called()

    @pytest.mark.asyncio
    async def test_classify_abc_item_from_db(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test ABC classification fetches from DB when not cached."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        
        result = await engine.classify_abc_item(ingredient_id=1001)
        
        assert result == "A"
        assert engine._abc_cache[1001] == "A"

    @pytest.mark.asyncio
    async def test_classify_abc_item_default_c(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test ABC classification defaults to 'C' when undefined."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        ingredient = sample_ingredients[0]
        ingredient.abc_class = None
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        
        result = await engine.classify_abc_item(ingredient_id=1001)
        
        assert result == "C"

    @pytest.mark.asyncio
    async def test_classify_all_ingredients(
        self, mock_db_session, restaurant_id, sample_ingredients, mock_inventory_stats
    ):
        """Test ABC classification of all ingredients based on consumption value."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.ingredient_repo.get_all = AsyncMock(return_value=sample_ingredients)
        engine.ingredient_repo.update = AsyncMock()
        engine.ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier = AsyncMock(
            side_effect=[
                MagicMock(cost_per_unit=Decimal("5.00")),
                MagicMock(cost_per_unit=Decimal("2.00")),
                MagicMock(cost_per_unit=Decimal("3.00")),
            ]
        )
        
        # Mock usage values to create clear A/B/C distribution
        async def mock_usage(ingredient_id, days):
            usage_map = {
                1001: Decimal("100.00"),  # High value: 100 * $5 = $500
                1002: Decimal("50.00"),   # Medium: 50 * $2 = $100
                1003: Decimal("10.00"),   # Low: 10 * $3 = $30
            }
            return usage_map.get(ingredient_id, Decimal("0"))
        
        mock_inventory_stats.get_total_usage_last_n_days.side_effect = mock_usage
        
        await engine.classify_all_ingredients(days=90)
        
        # Should update all ingredients
        assert engine.ingredient_repo.update.call_count >= 1
        engine.ingredient_repo.update.assert_any_call(1001, {"abc_class": "B"})
        engine.ingredient_repo.update.assert_any_call(1002, {"abc_class": "C"})
        
        # Cache should be populated
        assert len(engine._abc_cache) == 3

    @pytest.mark.asyncio
    async def test_classify_all_ingredients_empty(
        self, mock_db_session, restaurant_id
    ):
        """Test ABC classification handles empty ingredient list."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_all = AsyncMock(return_value=[])
        
        await engine.classify_all_ingredients(days=90)
        
        assert len(engine._abc_cache) == 0

    @pytest.mark.asyncio
    async def test_create_low_stock_alert(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        """Test low stock alert creation."""
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        engine.alert_repo = AsyncMock()
        engine.alert_repo.get_open_low_stock_alert = AsyncMock(return_value=None)
        engine.alert_repo.create = AsyncMock()
        
        await engine.create_low_stock_alert(
            ingredient_id=1001,
            current_stock=Decimal("5.00"),
            reorder_point=Decimal("15.00")
        )
        
        engine.alert_repo.create.assert_called_once()
        call_args = engine.alert_repo.create.call_args[0][0]
        assert call_args["alert_type"] == "LowStock"
        assert call_args["restaurant_id"] == restaurant_id
        assert "Ground Beef" in call_args["message"]
        assert "5" in call_args["message"]
        assert "15" in call_args["message"]
        assert call_args["role"] == "system"
        assert call_args["severity"] == "warning"
        assert call_args["meta"]["ingredient_id"] == 1001

    @pytest.mark.asyncio
    async def test_create_low_stock_alert_updates_existing_open_alert(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        engine.alert_repo = AsyncMock()
        engine.alert_repo.get_open_low_stock_alert = AsyncMock(
            return_value=MagicMock(alert_id=77)
        )
        engine.alert_repo.update = AsyncMock()
        engine.alert_repo.create = AsyncMock()

        await engine.create_low_stock_alert(
            ingredient_id=1001,
            current_stock=Decimal("4.00"),
            reorder_point=Decimal("15.00")
        )

        engine.alert_repo.update.assert_awaited_once()
        engine.alert_repo.create.assert_not_awaited()
