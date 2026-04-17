import pytest
from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, patch

from app.services.reorder_forecast_engine import ReorderForecastEngine


class DummyIngredient:
    def __init__(
        self,
        ingredient_id: int,
        unit_cost: Decimal,
        abc_class: str | None,
        policy_type: str | None = "stable_stocked",
        policy_assignment_mode: str | None = "manual",
        target_service_level: float | None = 0.95,
        service_level_z: float | None = None,
        policy_override_reason: str | None = None,
        category: str | None = None,
        is_active: bool = True,
    ):
        self.ingredient_id = ingredient_id
        self.unit_cost = unit_cost
        self.abc_class = abc_class
        self.name = f"Ingredient {ingredient_id}"
        self.category = category
        self.policy_type = policy_type
        self.policy_assignment_mode = policy_assignment_mode
        self.target_service_level = target_service_level
        self.service_level_z = service_level_z
        self.policy_override_reason = policy_override_reason
        self.is_active = is_active


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

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("99.00")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1001,
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
    assert decision["reorder_point"] == Decimal("4.00")
    assert decision["demand_source"] == "forecast_daily_breakdown"
    assert decision["reorder_method"] == "perishable_window"
    assert decision["policy_buffer_quantity"] == Decimal("1.00")
    assert decision["reserve_type"] == "perishable_reserve"
    assert decision["safety_stock"] == Decimal("0.00")
    assert decision["inventory_position"] == Decimal("1.00")
    assert decision["inbound_quantity"] == Decimal("0.00")
    assert decision["backorder_quantity"] == Decimal("0.00")
    assert "inbound quantity unavailable; assumed zero" in decision["assumption_warnings"]
    assert "backorders unavailable; assumed zero" in decision["assumption_warnings"]
    assert decision["spoilage_cap_quantity"] == Decimal("3.00")
    assert decision["max_target_stock"] == Decimal("3.00")
    assert decision["max_order_cap"] == Decimal("2.00")
    assert decision["policy_safe_quantity"] == Decimal("2.00")
    assert decision["buffered_quantity"] == Decimal("2.00")
    assert decision["abc_multiplier"] is None
    assert decision["final_quantity"] == Decimal("2.00")


@pytest.mark.asyncio
async def test_build_reorder_decision_preserves_public_payload_contract():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=1010,
            unit_cost=Decimal("2.50"),
            abc_class="B",
            policy_type="stable_stocked",
            policy_assignment_mode="manual",
            target_service_level=0.95,
        )
    )
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
        (date(2026, 4, 15) + timedelta(days=index), Decimal("5.00"))
        for index in range(5)
    ]

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("3.00")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("95.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1010,
                unit="lb",
                lead_time=3,
                daily_forecast=daily_forecast,
                supplier=None,
                as_of_date=date(2026, 4, 15),
                shelf_life_days=5,
                current_stock=Decimal("5.00"),
                current_unit="lb",
                moq=Decimal("10.00"),
                manage_alerts=False,
            )

    expected_keys = {
        "ingredient_id",
        "current_stock",
        "total_stock",
        "excluded_expiring_stock",
        "lead_demand",
        "shelf_demand",
        "total_demand",
        "safety_stock",
        "reorder_point",
        "reorder_target",
        "raw_order_quantity",
        "buffered_quantity",
        "moq",
        "moq_floor",
        "max_allowed",
        "max_target_stock",
        "max_order_cap",
        "final_quantity",
        "should_reorder",
        "skip_reason",
        "service_level_z",
        "abc_class",
        "abc_defaulted",
        "demand_source",
        "reorder_method",
        "policy_buffer_quantity",
        "policy_type",
        "policy_assignment_mode",
        "target_service_level",
        "service_level_source",
        "policy_override_reason",
        "policy_inferred",
        "effective_lead_days",
        "coverage_days",
        "uncapped_coverage_days",
        "coverage_capped_by_shelf_life",
        "demand_event_count",
        "next_event_demand",
        "inventory_position",
        "inbound_quantity",
        "backorder_quantity",
        "assumption_warnings",
        "policy_safe_quantity",
        "usable_until_date",
        "inventory_source",
        "inventory_conversion_fallback",
        "next_order_date",
        "next_delivery_date",
        "days_until_next_order",
        "review_period_days",
        "protection_window_days",
        "allowed_order_days",
        "allowed_delivery_days",
        "cadence_source",
        "cadence_confidence_score",
        "cadence_warnings",
        "review_required",
    }

    assert expected_keys.issubset(decision.keys())


@pytest.mark.asyncio
async def test_bootstrap_missing_policy_config_assigns_fresh_perishable_for_short_shelf_life():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    ingredient = DummyIngredient(
        ingredient_id=2001,
        unit_cost=Decimal("1.00"),
        abc_class="B",
        policy_type=None,
        policy_assignment_mode=None,
        target_service_level=None,
        category="Produce",
    )
    ingredient.name = "Cilantro"

    engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
    engine.ingredient_repo.update = AsyncMock()
    engine.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[])
    engine.inventory_repo.get_inventory_by_ingredient = AsyncMock(
        return_value=SimpleNamespace(shelf_life_days=3)
    )
    engine.recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[]
    )
    engine.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[]
    )
    engine.menu_item_recipe_repo.get_by_recipe = AsyncMock(return_value=[])

    summary = await engine.bootstrap_missing_policy_config(
        ingredient_forecast={
            2001: {
                "daily_breakdown": [
                    (date(2026, 4, 15) + timedelta(days=index), Decimal("1.00"))
                    for index in range(5)
                ]
            }
        },
        as_of_date=date(2026, 4, 15),
    )

    update_payload = engine.ingredient_repo.update.await_args.args[1]
    assert update_payload["policy_type"] == "fresh_perishable"
    assert update_payload["policy_assignment_mode"] == "system"
    assert update_payload["target_service_level"] == Decimal("0.9000")
    assert "EOD bootstrap inferred policy_type=fresh_perishable" in update_payload[
        "policy_override_reason"
    ]
    assert summary["updated_count"] == 1
    assert summary["failed_count"] == 0


@pytest.mark.asyncio
async def test_bootstrap_missing_policy_config_preserves_existing_manual_policy_type_when_filling_service_level():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    ingredient = DummyIngredient(
        ingredient_id=2002,
        unit_cost=Decimal("1.00"),
        abc_class="A",
        policy_type="stable_stocked",
        policy_assignment_mode="manual",
        target_service_level=None,
        service_level_z=None,
        policy_override_reason=None,
    )

    engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
    engine.ingredient_repo.update = AsyncMock()
    engine.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[])
    engine.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=None)

    summary = await engine.bootstrap_missing_policy_config(
        ingredient_forecast={
            2002: {
                "daily_breakdown": [
                    (date(2026, 4, 15) + timedelta(days=index), Decimal("2.00"))
                    for index in range(7)
                ]
            }
        },
        as_of_date=date(2026, 4, 15),
    )

    update_payload = engine.ingredient_repo.update.await_args.args[1]
    assert "policy_type" not in update_payload
    assert "policy_assignment_mode" not in update_payload
    assert update_payload["target_service_level"] == Decimal("0.9500")
    assert (
        update_payload["policy_override_reason"]
        == "EOD bootstrap filled missing service-level defaults for policy_type=stable_stocked."
    )
    assert summary["updated_count"] == 1


@pytest.mark.asyncio
async def test_bootstrap_missing_policy_config_skips_complete_manual_policy():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    ingredient = DummyIngredient(
        ingredient_id=2003,
        unit_cost=Decimal("1.00"),
        abc_class="C",
        policy_type="stable_stocked",
        policy_assignment_mode="manual",
        target_service_level=0.95,
    )

    engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
    engine.ingredient_repo.update = AsyncMock()

    summary = await engine.bootstrap_missing_policy_config(
        ingredient_forecast={2003: {"daily_breakdown": []}},
        as_of_date=date(2026, 4, 15),
    )

    engine.ingredient_repo.update.assert_not_awaited()
    assert summary["updated_count"] == 0
    assert summary["skipped_count"] == 1


@pytest.mark.asyncio
async def test_bootstrap_missing_policy_config_prefers_fresh_over_recipe_dependency():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    ingredient = DummyIngredient(
        ingredient_id=2004,
        unit_cost=Decimal("1.00"),
        abc_class="B",
        policy_type=None,
        policy_assignment_mode=None,
        target_service_level=None,
    )
    ingredient.name = "Aioli Base"

    engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
    engine.ingredient_repo.update = AsyncMock()
    engine.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[])
    engine.inventory_repo.get_inventory_by_ingredient = AsyncMock(
        return_value=SimpleNamespace(shelf_life_days=3)
    )
    engine.recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[]
    )
    engine.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[SimpleNamespace(batch_recipe_id=7001)]
    )

    await engine.bootstrap_missing_policy_config(
        ingredient_forecast={
            2004: {
                "daily_breakdown": [
                    (date(2026, 4, 15) + timedelta(days=index), Decimal("1.00"))
                    for index in range(5)
                ]
            }
        },
        as_of_date=date(2026, 4, 15),
    )

    update_payload = engine.ingredient_repo.update.await_args.args[1]
    assert update_payload["policy_type"] == "fresh_perishable"


@pytest.mark.asyncio
async def test_bootstrap_missing_policy_config_assigns_intermittent_for_sparse_demand():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    ingredient = DummyIngredient(
        ingredient_id=2005,
        unit_cost=Decimal("1.00"),
        abc_class="C",
        policy_type=None,
        policy_assignment_mode=None,
        target_service_level=None,
    )
    ingredient.name = "Truffle Oil"

    engine.ingredient_repo.get_by_id = AsyncMock(return_value=ingredient)
    engine.ingredient_repo.update = AsyncMock()
    engine.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[])
    engine.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=None)
    engine.recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[]
    )
    engine.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[]
    )
    engine.menu_item_recipe_repo.get_by_recipe = AsyncMock(return_value=[])

    daily_breakdown = [
        (date(2026, 4, 15) + timedelta(days=index), Decimal("0.00"))
        for index in range(14)
    ]
    daily_breakdown[4] = (date(2026, 4, 19), Decimal("1.50"))

    await engine.bootstrap_missing_policy_config(
        ingredient_forecast={2005: {"daily_breakdown": daily_breakdown}},
        as_of_date=date(2026, 4, 15),
    )

    update_payload = engine.ingredient_repo.update.await_args.args[1]
    assert update_payload["policy_type"] == "intermittent_low_turn"
    assert update_payload["target_service_level"] == Decimal("0.8800")


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
    assert decision["reorder_method"] == "continuous_review"


@pytest.mark.asyncio
async def test_fresh_perishable_applies_spoilage_cap_before_moq():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=2001,
            unit_cost=Decimal("3.00"),
            abc_class="A",
            policy_type="fresh_perishable",
            policy_assignment_mode="manual",
            target_service_level=0.92,
        )
    )
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
        for index in range(3)
    ]

    with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
        decision = await engine.build_reorder_decision(
            ingredient_id=2001,
            unit="lb",
            lead_time=0,
            daily_forecast=daily_forecast,
            supplier=SimpleNamespace(spoilage_rate=None),
            as_of_date=date(2026, 4, 15),
            shelf_life_days=3,
            current_stock=Decimal("0.00"),
            current_unit="lb",
            moq=Decimal("5.00"),
            manage_alerts=False,
        )

    assert decision["raw_order_quantity"] == Decimal("4.00")
    assert decision["spoilage_cap_quantity"] == Decimal("3.00")
    assert decision["max_target_stock"] == Decimal("3.00")
    assert decision["max_order_cap"] == Decimal("3.00")
    assert decision["policy_safe_quantity"] == Decimal("3.00")
    assert decision["buffered_quantity"] == Decimal("3.00")
    assert decision["final_quantity"] == Decimal("3.00")
    assert decision["moq_review_required"] is True
    assert decision["review_required"] is True
    assert decision["policy_review_warnings"] == [
        "configured MOQ exceeds waste-safe cap; review required"
    ]


@pytest.mark.asyncio
async def test_recipe_dependent_uses_minimal_topology_guard_without_recomputing_forecast():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=4101,
            unit_cost=Decimal("3.25"),
            abc_class="B",
            policy_type="recipe_dependent",
            policy_assignment_mode="manual",
            target_service_level=0.90,
        )
    )
    engine.recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[SimpleNamespace(recipe_id=7001)]
    )
    engine.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[SimpleNamespace(batch_recipe_id=8001)]
    )
    engine.menu_item_recipe_repo.get_by_recipe = AsyncMock(
        return_value=[SimpleNamespace(menu_item_id=9001)]
    )
    engine.stats_service.get_usable_inventory = AsyncMock(
        return_value={
            "quantity": Decimal("1.00"),
            "unit": "lb",
            "total_quantity": Decimal("1.00"),
            "excluded_quantity": Decimal("0.00"),
            "source": "inventory_summary",
            "conversion_fallback": False,
        }
    )

    daily_forecast = [
        (date(2026, 4, 15), Decimal("2.00")),
        (date(2026, 4, 16), Decimal("4.00")),
        (date(2026, 4, 17), Decimal("1.00")),
    ]

    with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
        decision = await engine.build_reorder_decision(
            ingredient_id=4101,
            unit="lb",
            lead_time=2,
            daily_forecast=daily_forecast,
            supplier=None,
            as_of_date=date(2026, 4, 15),
            shelf_life_days=10,
            current_stock=Decimal("1.00"),
            current_unit="lb",
            moq=Decimal("1.00"),
            manage_alerts=False,
        )

    assert decision["policy_type"] == "recipe_dependent"
    assert decision["reorder_method"] == "recipe_net_requirement_order_up_to"
    assert decision["recipe_dependency_mode"] == "mixed"
    assert decision["net_requirement_quantity"] == Decimal("6.00")
    assert decision["menu_guard_quantity"] == Decimal("3.00")
    assert decision["batch_guard_quantity"] == Decimal("4.00")
    assert decision["policy_buffer_quantity"] == Decimal("4.00")
    assert decision["reorder_point"] == Decimal("6.00")
    assert decision["reorder_target"] == Decimal("10.00")
    assert decision["raw_order_quantity"] == Decimal("9.00")
    assert decision["max_target_stock"] == Decimal("6.00")
    assert decision["max_order_cap"] == Decimal("5.00")
    assert decision["policy_safe_quantity"] == Decimal("5.00")
    assert decision["final_quantity"] == Decimal("5.00")
    assert decision["safety_stock"] == Decimal("0.00")


@pytest.mark.asyncio
async def test_build_reorder_decision_dispatches_intermittent_policy_method():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=1003,
            unit_cost=Decimal("8.00"),
            abc_class="C",
            policy_type="intermittent_low_turn",
            policy_assignment_mode="manual",
            target_service_level=0.88,
        )
    )
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
        (date(2026, 4, 15), Decimal("0.00")),
        (date(2026, 4, 16), Decimal("0.00")),
        (date(2026, 4, 17), Decimal("4.00")),
        (date(2026, 4, 18), Decimal("0.00")),
        (date(2026, 4, 19), Decimal("0.00")),
    ]

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("2.00")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1003,
                unit="lb",
                lead_time=0,
                daily_forecast=daily_forecast,
                supplier=None,
                as_of_date=date(2026, 4, 15),
                shelf_life_days=5,
                current_stock=Decimal("0.00"),
                current_unit="lb",
                moq=Decimal("1.00"),
                manage_alerts=False,
            )

    assert decision["policy_type"] == "intermittent_low_turn"
    assert decision["reorder_method"] == "sparse_event_replenishment"
    assert decision["next_event_demand"] == Decimal("4.00")
    assert decision["policy_buffer_quantity"] == Decimal("0.00")
    assert decision["demand_sparsity_classification"] == "single_event"
    assert decision["event_spacing_days"] == []
    assert decision["reorder_point"] == Decimal("4.00")
    assert decision["reorder_target"] == Decimal("4.00")
    assert decision["policy_safe_quantity"] == Decimal("4.00")
    assert decision["final_quantity"] == Decimal("4.00")


@pytest.mark.asyncio
async def test_intermittent_low_turn_flags_moq_inflation_review():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(
            ingredient_id=1004,
            unit_cost=Decimal("8.00"),
            abc_class="C",
            policy_type="intermittent_low_turn",
            policy_assignment_mode="manual",
            target_service_level=0.88,
        )
    )
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
        (date(2026, 4, 15), Decimal("0.00")),
        (date(2026, 4, 16), Decimal("2.00")),
        (date(2026, 4, 17), Decimal("0.00")),
        (date(2026, 4, 18), Decimal("2.00")),
        (date(2026, 4, 19), Decimal("0.00")),
    ]

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("5.00")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("100.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1004,
                unit="lb",
                lead_time=0,
                daily_forecast=daily_forecast,
                supplier=None,
                as_of_date=date(2026, 4, 15),
                shelf_life_days=5,
                current_stock=Decimal("0.00"),
                current_unit="lb",
                moq=Decimal("10.00"),
                manage_alerts=False,
            )

    assert decision["demand_sparsity_classification"] == "repeated_sparse"
    assert decision["event_spacing_days"] == [2]
    assert decision["policy_buffer_quantity"] == Decimal("0.40")
    assert decision["max_target_stock"] == Decimal("4.00")
    assert decision["max_order_cap"] == Decimal("4.00")
    assert decision["policy_safe_quantity"] == Decimal("2.40")
    assert decision["final_quantity"] == Decimal("4.00")
    assert decision["moq_review_required"] is True
    assert "configured MOQ exceeds stock-position cap; review required" in decision[
        "policy_review_warnings"
    ]
    assert "configured MOQ materially exceeds sparse policy-safe quantity" in decision[
        "policy_review_warnings"
    ]