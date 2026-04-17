import pytest
from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call

from app.services.reorder_forecast_engine import ReorderForecastEngine


class DummyIngredient:
    def __init__(
        self,
        ingredient_id: int,
        unit_cost: Decimal,
        abc_class: str | None,
        policy_type: str | None = None,
        policy_assignment_mode: str | None = None,
        target_service_level: float | None = None,
        service_level_z: float | None = None,
        policy_override_reason: str | None = None,
    ):
        self.ingredient_id = ingredient_id
        self.unit_cost = unit_cost
        self.abc_class = abc_class
        self.name = f"Ingredient {ingredient_id}"
        self.policy_type = policy_type
        self.policy_assignment_mode = policy_assignment_mode
        self.target_service_level = target_service_level
        self.service_level_z = service_level_z
        self.policy_override_reason = policy_override_reason


@pytest.mark.asyncio
async def test_classify_abc_item_uses_cache(monkeypatch):
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)

    ingredient = DummyIngredient(ingredient_id=42, unit_cost=Decimal("1.00"), abc_class="B")
    engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)

    first = await engine.classify_abc_item(42)
    assert first == "B"
    assert engine.ingredient_repo.get_by_id.await_count == 1

    engine.ingredient_repo.get_by_id.reset_mock()
    second = await engine.classify_abc_item(42)
    assert second == "B"
    engine.ingredient_repo.get_by_id.assert_not_awaited()


@pytest.mark.asyncio
async def test_classify_all_updates_only_changed_items(monkeypatch):
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)

    ingredients = [
        DummyIngredient(ingredient_id=1, unit_cost=Decimal("2.00"), abc_class="B"),
        DummyIngredient(ingredient_id=2, unit_cost=Decimal("2.00"), abc_class="B"),
        DummyIngredient(ingredient_id=3, unit_cost=Decimal("4.00"), abc_class=None),
    ]

    engine.ingredient_repo.get_all = AsyncMock(return_value=ingredients)
    engine.stats_service.get_total_usage_last_n_days = AsyncMock(
        side_effect=[
            Decimal("30"),
            Decimal("10"),
            Decimal("5"),
        ]
    )
    engine.ingredient_repo.update = AsyncMock()

    await engine.classify_all_ingredients(days=30)

    engine.stats_service.get_total_usage_last_n_days.assert_awaited()
    engine.ingredient_repo.update.assert_has_awaits(
        [
            call(1, {"abc_class": "A"}),
            call(3, {"abc_class": "C"}),
        ],
        any_order=True,
    )
    engine.ingredient_repo.update.assert_awaited()
    for update_call in engine.ingredient_repo.update.await_args_list:
        assert update_call.args[0] in {1, 3}
    assert engine._abc_cache == {1: "A", 2: "B", 3: "C"}


@pytest.mark.asyncio
async def test_choose_supplier_option_prefers_best_cadence_when_configured():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)

    slower_preferred = SimpleNamespace(
        supplier_id=10,
        preferred=True,
        supplier_priority=1,
        cost_per_unit=Decimal("3.00"),
        lead_time_days=2,
        review_period_days=7,
        order_schedule_type="fixed_days_of_week",
        allowed_order_days=["fri"],
        allowed_delivery_days=["sun"],
        cadence_source="manual",
        cadence_confidence_score=0.9,
    )
    faster_preferred = SimpleNamespace(
        supplier_id=20,
        preferred=True,
        supplier_priority=5,
        cost_per_unit=Decimal("3.50"),
        lead_time_days=2,
        review_period_days=7,
        order_schedule_type="fixed_days_of_week",
        allowed_order_days=["thu"],
        allowed_delivery_days=["fri"],
        cadence_source="manual",
        cadence_confidence_score=0.95,
    )

    selected = await engine.choose_supplier_option(
        [slower_preferred, faster_preferred],
        as_of_date=date(2026, 4, 15),
    )

    assert selected is not None
    assert selected["supplier"] is faster_preferred
    assert selected["reason_code"] == "preferred_best_cadence"
    assert selected["cadence_context"]["next_delivery_date"] == date(2026, 4, 17)


@pytest.mark.asyncio
async def test_build_reorder_decision_from_forecast_uses_cadence_window_and_shelf_life_cap():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=1001,
            unit_cost=Decimal("2.50"),
            abc_class="B",
            policy_type="fresh_perishable",
            policy_assignment_mode="manual",
            target_service_level=0.92,
            policy_override_reason="Fresh produce coverage cap",
        )
    )
    engine.stats_service.get_average_daily_usage = AsyncMock(return_value=Decimal("2.00"))
    engine.stats_service.get_usable_inventory = AsyncMock(
        return_value={
            "quantity": Decimal("1.00"),
            "unit": "lb",
            "total_quantity": Decimal("2.50"),
            "excluded_quantity": Decimal("1.50"),
            "source": "usable_lot_projection",
            "conversion_fallback": False,
        }
    )

    supplier = SimpleNamespace(
        supplier_id=501,
        preferred=True,
        supplier_priority=1,
        cost_per_unit=Decimal("4.50"),
        lead_time_days=2,
        review_period_days=4,
        order_schedule_type="every_n_days",
        allowed_order_days=None,
        allowed_delivery_days=None,
        cadence_source="manual",
        cadence_confidence_score=0.9,
    )

    daily_forecast = [
        (date(2026, 4, 15) + timedelta(days=index), Decimal("1.00"))
        for index in range(10)
    ]

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("2.50")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1001,
                lead_demand=Decimal("0.00"),
                shelf_demand=Decimal("0.00"),
                total_demand=Decimal("0.00"),
                unit="lb",
                lead_time=2,
                daily_forecast=daily_forecast,
                supplier=supplier,
                as_of_date=date(2026, 4, 15),
                shelf_life_days=3,
                current_stock=Decimal("1.00"),
                current_unit="lb",
                moq=Decimal("1.00"),
                manage_alerts=False,
            )

    assert decision["policy_type"] == "fresh_perishable"
    assert decision["policy_assignment_mode"] == "manual"
    assert decision["service_level_source"] == "ingredient_target"
    assert decision["effective_lead_days"] == 6
    assert decision["protection_window_days"] == 10
    assert decision["coverage_days"] == 3
    assert decision["coverage_capped_by_shelf_life"] is True
    assert decision["inventory_source"] == "usable_lot_projection"
    assert decision["total_stock"] == Decimal("2.50")
    assert decision["excluded_expiring_stock"] == Decimal("1.50")
    assert decision["lead_demand"] == Decimal("3.00")
    assert decision["shelf_demand"] == Decimal("0.00")
    assert decision["reorder_point"] == Decimal("5.50")
    assert decision["final_quantity"] == Decimal("4.95")


@pytest.mark.asyncio
async def test_build_reorder_decision_without_supplier_uses_shelf_life_window():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=1002,
            unit_cost=Decimal("2.00"),
            abc_class="A",
        )
    )
    engine.stats_service.get_average_daily_usage = AsyncMock(return_value=Decimal("1.00"))
    engine.stats_service.get_usable_inventory = AsyncMock(
        return_value={
            "quantity": Decimal("0.00"),
            "unit": "lb",
            "total_quantity": Decimal("0.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }
    )

    daily_forecast = [
        (date(2026, 4, 15) + timedelta(days=index), Decimal("1.00"))
        for index in range(5)
    ]

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("0.00")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1002,
                lead_demand=Decimal("0.00"),
                shelf_demand=Decimal("0.00"),
                total_demand=Decimal("0.00"),
                unit="lb",
                lead_time=0,
                daily_forecast=daily_forecast,
                supplier=None,
                as_of_date=date(2026, 4, 15),
                shelf_life_days=3,
                current_stock=Decimal("0.00"),
                current_unit="lb",
                moq=Decimal("1.00"),
                manage_alerts=False,
            )

    assert decision["coverage_days"] == 3
    assert decision["lead_demand"] == Decimal("0.00")
    assert decision["shelf_demand"] == Decimal("3.00")
    assert decision["total_demand"] == Decimal("3.00")