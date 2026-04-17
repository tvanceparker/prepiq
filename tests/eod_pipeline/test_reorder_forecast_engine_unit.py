"""
Unit tests for ReorderForecastEngine.

Tests forecast-driven reorder calculations, safety stock, ABC classification,
and low-stock alert behavior.
"""
import math
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.reorder_forecast_engine import ReorderForecastEngine


class TestReorderForecastEngineUnit:
    """Unit tests for individual ReorderForecastEngine methods."""

    @pytest.mark.asyncio
    async def test_calculate_safety_stock(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats

        mock_inventory_stats.get_std_dev_usage.return_value = Decimal("0.50")
        lead_time = 3

        result = await engine.calculate_safety_stock(
            ingredient_id=1001,
            lead_time=lead_time,
            service_level_z=Decimal("1.65"),
        )

        expected = Decimal("1.65") * Decimal("0.50") * Decimal(str(math.sqrt(lead_time)))
        assert abs(result - expected.quantize(Decimal("0.01"))) < Decimal("0.01")

    @pytest.mark.asyncio
    async def test_calculate_safety_stock_zero_stddev(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats

        mock_inventory_stats.get_std_dev_usage.return_value = Decimal("0")

        result = await engine.calculate_safety_stock(
            ingredient_id=1001,
            lead_time=3,
            service_level_z=Decimal("1.65"),
        )

        assert result == Decimal("0.00")

    @pytest.mark.asyncio
    async def test_calculate_max_order_with_limit(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats

        mock_inventory_stats.get_max_stock_level.return_value = Decimal("100.00")

        result = await engine.calculate_max_order(
            ingredient_id=1001,
            current_stock=Decimal("50.00"),
        )

        assert result == Decimal("50.00")

    @pytest.mark.asyncio
    async def test_calculate_max_order_no_limit(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats

        mock_inventory_stats.get_max_stock_level.return_value = None

        result = await engine.calculate_max_order(
            ingredient_id=1001,
            current_stock=Decimal("50.00"),
        )

        assert result == Decimal("Infinity")

    @pytest.mark.asyncio
    async def test_calculate_max_order_at_capacity(
        self, mock_db_session, restaurant_id, mock_inventory_stats
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats

        mock_inventory_stats.get_max_stock_level.return_value = Decimal("100.00")

        result = await engine.calculate_max_order(
            ingredient_id=1001,
            current_stock=Decimal("110.00"),
        )

        assert result == Decimal("0")

    @pytest.mark.asyncio
    async def test_build_reorder_decision_class_a_forecast_path(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()

        ingredient = sample_ingredients[0]
        ingredient.abc_class = "A"
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
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
            (date(2026, 4, 15) + timedelta(days=index), Decimal("10.00"))
            for index in range(3)
        ]

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("5.00")):
            with patch.object(engine, "calculate_max_order", return_value=Decimal("190.00")):
                decision = await engine.build_reorder_decision(
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

        assert decision["abc_class"] == "A"
        assert decision["reorder_point"] == Decimal("35.00")
        assert decision["reorder_target"] == Decimal("35.00")
        assert decision["final_quantity"] == Decimal("25.00")

    @pytest.mark.asyncio
    async def test_build_reorder_decision_class_b_forecast_path(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()

        ingredient = sample_ingredients[1]
        ingredient.abc_class = "B"
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        mock_inventory_stats.get_average_daily_usage.return_value = Decimal("2.00")
        mock_inventory_stats.get_usable_inventory.return_value = {
            "quantity": Decimal("5.00"),
            "unit": "head",
            "total_quantity": Decimal("5.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }

        daily_forecast = [
            (date(2026, 4, 15) + timedelta(days=index), Decimal("5.00"))
            for index in range(3)
        ]

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("3.00")):
            with patch.object(engine, "calculate_max_order", return_value=Decimal("95.00")):
                decision = await engine.build_reorder_decision(
                    ingredient_id=1002,
                    unit="head",
                    lead_time=3,
                    daily_forecast=daily_forecast,
                    supplier=None,
                    as_of_date=date(2026, 4, 15),
                    shelf_life_days=3,
                    current_stock=Decimal("5.00"),
                    current_unit="head",
                    moq=Decimal("10.00"),
                    manage_alerts=False,
                )

        assert decision["abc_class"] == "B"
    assert decision["reorder_point"] == Decimal("18.00")
        assert decision["reorder_target"] == Decimal("18.00")
    assert decision["buffered_quantity"] == Decimal("13.00")
    assert decision["abc_multiplier"] is None
    assert decision["final_quantity"] == Decimal("13.00")

    @pytest.mark.asyncio
    async def test_build_reorder_decision_class_c_forecast_path(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()

        ingredient = sample_ingredients[2]
        ingredient.abc_class = "C"
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
        mock_inventory_stats.get_average_daily_usage.return_value = Decimal("1.50")
        mock_inventory_stats.get_usable_inventory.return_value = {
            "quantity": Decimal("3.00"),
            "unit": "lb",
            "total_quantity": Decimal("3.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }

        daily_forecast = [
            (date(2026, 4, 15) + timedelta(days=index), Decimal("6.00"))
            for index in range(3)
        ]

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("2.00")):
            with patch.object(engine, "calculate_max_order", return_value=Decimal("77.00")):
                decision = await engine.build_reorder_decision(
                    ingredient_id=1003,
                    unit="lb",
                    lead_time=3,
                    daily_forecast=daily_forecast,
                    supplier=None,
                    as_of_date=date(2026, 4, 15),
                    shelf_life_days=3,
                    current_stock=Decimal("3.00"),
                    current_unit="lb",
                    moq=Decimal("5.00"),
                    manage_alerts=False,
                )

        assert decision["abc_class"] == "C"
        assert decision["moq_floor"] == Decimal("5.00")
        assert decision["buffered_quantity"] == Decimal("17.00")
        assert decision["abc_multiplier"] is None
        assert decision["final_quantity"] == Decimal("17.00")

    @pytest.mark.asyncio
    async def test_build_reorder_decision_above_reorder_point_resolves_alert(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()
        engine.alert_repo.resolve_open_low_stock_alerts = AsyncMock(return_value=1)

        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        mock_inventory_stats.get_average_daily_usage.return_value = Decimal("2.00")
        mock_inventory_stats.get_usable_inventory.return_value = {
            "quantity": Decimal("100.00"),
            "unit": "lb",
            "total_quantity": Decimal("100.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }

        daily_forecast = [
            (date(2026, 4, 15) + timedelta(days=index), Decimal("10.00"))
            for index in range(3)
        ]

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("5.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1001,
                unit="lb",
                lead_time=3,
                daily_forecast=daily_forecast,
                supplier=None,
                as_of_date=date(2026, 4, 15),
                shelf_life_days=7,
                current_stock=Decimal("100.00"),
                current_unit="lb",
                moq=Decimal("5.00"),
                manage_alerts=True,
            )

        assert decision["should_reorder"] is False
        assert decision["final_quantity"] == Decimal("0.00")
        engine.alert_repo.resolve_open_low_stock_alerts.assert_awaited_once_with(1001)

    @pytest.mark.asyncio
    async def test_build_reorder_decision_below_reorder_point_creates_alert(
        self, mock_db_session, restaurant_id, mock_inventory_stats, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.stats_service = mock_inventory_stats
        engine.alert_repo = AsyncMock()
        engine.create_low_stock_alert = AsyncMock()

        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        mock_inventory_stats.get_average_daily_usage.return_value = Decimal("2.00")
        mock_inventory_stats.get_usable_inventory.return_value = {
            "quantity": Decimal("5.00"),
            "unit": "lb",
            "total_quantity": Decimal("5.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }

        daily_forecast = [
            (date(2026, 4, 15) + timedelta(days=index), Decimal("10.00"))
            for index in range(3)
        ]

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("3.00")):
            with patch.object(engine, "calculate_max_order", return_value=Decimal("95.00")):
                await engine.build_reorder_decision(
                    ingredient_id=1001,
                    unit="lb",
                    lead_time=3,
                    daily_forecast=daily_forecast,
                    supplier=None,
                    as_of_date=date(2026, 4, 15),
                    shelf_life_days=7,
                    current_stock=Decimal("5.00"),
                    current_unit="lb",
                    moq=Decimal("10.00"),
                    manage_alerts=True,
                )

        engine.create_low_stock_alert.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_build_reorder_decision_normalizes_integer_inputs(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.alert_repo = AsyncMock()
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        engine.stats_service.get_average_daily_usage = AsyncMock(return_value=Decimal("1.00"))
        engine.stats_service.get_usable_inventory = AsyncMock(
            return_value={
                "quantity": Decimal("5.00"),
                "unit": "lb",
                "total_quantity": Decimal("5.00"),
                "excluded_quantity": Decimal("0.00"),
                "source": "inventory_summary",
                "conversion_fallback": False,
            }
        )

        daily_forecast = [
            (date(2026, 4, 15), 1),
            (date(2026, 4, 16), 2),
        ]

        with patch.object(engine, "calculate_safety_stock", return_value=Decimal("3.00")):
            with patch.object(engine, "calculate_max_order", return_value=Decimal("95.00")):
                decision = await engine.build_reorder_decision(
                    ingredient_id=1001,
                    unit="lb",
                    lead_time=1,
                    daily_forecast=daily_forecast,
                    supplier=None,
                    as_of_date=date(2026, 4, 15),
                    shelf_life_days=2,
                    current_stock=5,
                    current_unit="lb",
                    moq=10,
                    manage_alerts=False,
                )

        assert decision["lead_demand"] == Decimal("1.00")
        assert decision["shelf_demand"] == Decimal("0.00")
        assert decision["total_demand"] == Decimal("1.00")
        assert decision["current_stock"] == Decimal("5.00")
        assert decision["moq"] == Decimal("10.00")

    @pytest.mark.asyncio
    async def test_classify_abc_item_cached(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
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
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])

        result = await engine.classify_abc_item(ingredient_id=1001)

        assert result == "A"
        assert engine._abc_cache[1001] == "A"

    @pytest.mark.asyncio
    async def test_classify_abc_item_default_c(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
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

        async def mock_usage(ingredient_id, days):
            usage_map = {
                1001: Decimal("100.00"),
                1002: Decimal("50.00"),
                1003: Decimal("10.00"),
            }
            return usage_map.get(ingredient_id, Decimal("0"))

        mock_inventory_stats.get_total_usage_last_n_days.side_effect = mock_usage

        await engine.classify_all_ingredients(days=90)

        assert engine.ingredient_repo.update.call_count >= 1
        engine.ingredient_repo.update.assert_any_call(1001, {"abc_class": "B"})
        engine.ingredient_repo.update.assert_any_call(1002, {"abc_class": "C"})
        assert len(engine._abc_cache) == 3

    @pytest.mark.asyncio
    async def test_classify_all_ingredients_empty(
        self, mock_db_session, restaurant_id
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_all = AsyncMock(return_value=[])

        await engine.classify_all_ingredients(days=90)

        assert len(engine._abc_cache) == 0

    @pytest.mark.asyncio
    async def test_create_low_stock_alert(
        self, mock_db_session, restaurant_id, sample_ingredients
    ):
        engine = ReorderForecastEngine(mock_db_session, restaurant_id, "master")
        engine.ingredient_repo.get_by_id = AsyncMock(return_value=sample_ingredients[0])
        engine.alert_repo = AsyncMock()
        engine.alert_repo.get_open_low_stock_alert = AsyncMock(return_value=None)
        engine.alert_repo.create = AsyncMock()

        await engine.create_low_stock_alert(
            ingredient_id=1001,
            current_stock=Decimal("5.00"),
            reorder_point=Decimal("15.00"),
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