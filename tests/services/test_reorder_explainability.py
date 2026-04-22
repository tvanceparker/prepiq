from datetime import date, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.inventory_service import InventoryService
from app.services.reorder_forecast_engine import ReorderForecastEngine


class DummyIngredient:
    def __init__(self, ingredient_id: int, abc_class: str | None):
        self.ingredient_id = ingredient_id
        self.abc_class = abc_class
        self.name = f"Ingredient {ingredient_id}"
        self.policy_type = "stable_stocked"
        self.policy_assignment_mode = "manual"
        self.target_service_level = 0.95
        self.service_level_z = None
        self.policy_override_reason = None


@pytest.mark.asyncio
async def test_choose_supplier_option_prefers_lowest_priority_preferred_supplier():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)

    fallback_supplier = MagicMock(
        supplier_id=10,
        preferred=False,
        supplier_priority=1,
        cost_per_unit=Decimal("3.00"),
    )
    preferred_high_priority = MagicMock(
        supplier_id=20,
        preferred=True,
        supplier_priority=4,
        cost_per_unit=Decimal("4.00"),
    )
    preferred_low_priority = MagicMock(
        supplier_id=30,
        preferred=True,
        supplier_priority=2,
        cost_per_unit=Decimal("5.00"),
    )

    selected = await engine.choose_supplier_option(
        [fallback_supplier, preferred_high_priority, preferred_low_priority]
    )

    assert selected is not None
    assert selected["supplier"] is preferred_low_priority
    assert selected["reason_code"] == "preferred_lowest_priority"
    assert selected["preferred_supplier_available"] is True
    assert selected["selected_supplier_priority"] == 2
    assert selected["pricing_available"] is True


@pytest.mark.asyncio
async def test_build_reorder_decision_returns_reusable_factor_breakdown():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(ingredient_id=1001, abc_class="B")
    )
    engine.stats_service.get_average_daily_usage = AsyncMock(return_value=Decimal("2.00"))
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
                ingredient_id=1001,
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

    assert decision["abc_class"] == "B"
    assert decision["abc_multiplier"] is None
    assert decision["reorder_point"] == Decimal("18.00")
    assert decision["reorder_target"] == Decimal("18.00")
    assert decision["raw_order_quantity"] == Decimal("13.00")
    assert decision["buffered_quantity"] == Decimal("13.00")
    assert decision["moq_floor"] == Decimal("10.00")
    assert decision["final_quantity"] == Decimal("13.00")
    assert decision["should_reorder"] is True
    assert decision["abc_defaulted"] is False


@pytest.mark.asyncio
async def test_build_explanation_payload_for_fresh_perishable_surfaces_assumptions_and_pack_warning():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=SimpleNamespace(
            ingredient_id=2001,
            abc_class="A",
            name="Berries",
            policy_type="fresh_perishable",
            policy_assignment_mode="manual",
            target_service_level=0.92,
            service_level_z=None,
            policy_override_reason=None,
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

    payload = engine.build_explanation_payload(
        decision=decision,
        supplier_selection={
            "reason_code": "preferred_lowest_priority",
            "preferred_supplier_available": True,
            "selected_supplier_priority": 1,
            "selected_supplier_preferred": True,
            "pricing_available": True,
        },
        supplier_name="Fresh Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=decision["final_quantity"],
        pack_size=4,
        quantity_per_pack_item=Decimal("2.00"),
        packs_to_order=1,
        total_quantity_ordered=Decimal("8.00"),
        assumption_flags={"inventory_source": "inventory_summary"},
    )

    assert "Fresh-perishable ordering uses a shelf-life-capped window" in payload["summary"]
    assert "Configured MOQ exceeds the waste-safe cap and should be reviewed" in payload["summary"]
    assert "Pack rounding pushes the ordered quantity above the spoilage-safe quantity" in payload["summary"]
    warnings = payload["assumption_flags"]["cadence_warnings"]
    assert "inbound quantity unavailable; assumed zero" in warnings
    assert "backorders unavailable; assumed zero" in warnings
    assert "configured MOQ exceeds waste-safe cap; review required" in warnings
    assert "pack rounding exceeds spoilage-safe quantity" in warnings


@pytest.mark.asyncio
async def test_build_explanation_payload_for_stable_stocked_uses_reorder_point_summary():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(ingredient_id=1001, abc_class="B")
    )
    engine.stats_service.get_average_daily_usage = AsyncMock(return_value=Decimal("2.00"))
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
                ingredient_id=1001,
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

    payload = engine.build_explanation_payload(
        decision=decision,
        supplier_selection={
            "reason_code": "fallback_lowest_priority",
            "preferred_supplier_available": False,
            "selected_supplier_priority": 2,
            "selected_supplier_preferred": False,
            "pricing_available": True,
        },
        supplier_name="Dry Goods Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=decision["final_quantity"],
        pack_size=1,
        quantity_per_pack_item=Decimal("1.00"),
        packs_to_order=13,
        total_quantity_ordered=Decimal("13.00"),
        assumption_flags={"inventory_source": "inventory_summary"},
    )

    assert "Stable-stocked ordering uses reorder point" in payload["summary"]
    assert "safety stock 3.00" in payload["summary"]
    warnings = payload["assumption_flags"]["cadence_warnings"]
    assert "inbound quantity unavailable; assumed zero" in warnings
    assert "backorders unavailable; assumed zero" in warnings


@pytest.mark.asyncio
async def test_build_explanation_payload_preserves_public_structure():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=DummyIngredient(ingredient_id=1011, abc_class="B")
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
                ingredient_id=1011,
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

    payload = engine.build_explanation_payload(
        decision=decision,
        supplier_selection={
            "reason_code": "fallback_lowest_priority",
            "preferred_supplier_available": False,
            "selected_supplier_priority": 2,
            "selected_supplier_preferred": False,
            "pricing_available": True,
        },
        supplier_name="Dry Goods Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=decision["final_quantity"],
        pack_size=1,
        quantity_per_pack_item=Decimal("1.00"),
        packs_to_order=13,
        total_quantity_ordered=Decimal("13.00"),
        assumption_flags={"inventory_source": "inventory_summary"},
    )

    assert set(payload.keys()) == {
        "summary",
        "why_reorder",
        "quantity_factors",
        "policy_factors",
        "supplier_factors",
        "assumption_flags",
    }
    assert {"current_stock", "reorder_point", "reorder_target"}.issubset(
        payload["why_reorder"].keys()
    )
    assert {
        "raw_order_quantity",
        "policy_safe_quantity",
        "max_order_cap",
        "final_quantity_before_pack_rounding",
        "total_quantity_ordered",
    }.issubset(payload["quantity_factors"].keys())
    assert {"policy_type", "reorder_method", "max_allowed"}.issubset(
        payload["policy_factors"].keys()
    )
    assert {"selected_supplier", "selection_rule", "pricing_available"}.issubset(
        payload["supplier_factors"].keys()
    )
    assert {"inventory_source", "cadence_warnings"}.issubset(
        payload["assumption_flags"].keys()
    )
    assert "review_required" in payload["assumption_flags"]


@pytest.mark.asyncio
async def test_build_explanation_payload_remains_compatible_with_cap_fields():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)

    payload = engine.build_explanation_payload(
        decision={
            "current_stock": Decimal("2.00"),
            "total_stock": Decimal("2.00"),
            "excluded_expiring_stock": Decimal("0.00"),
            "usable_until_date": None,
            "current_unit": "lb",
            "reorder_point": Decimal("4.00"),
            "lead_demand": Decimal("2.00"),
            "shelf_demand": Decimal("2.00"),
            "safety_stock": Decimal("1.00"),
            "reorder_target": Decimal("5.00"),
            "max_target_stock": Decimal("5.00"),
            "effective_lead_days": 2,
            "coverage_days": 4,
            "protection_window_days": 4,
            "raw_order_quantity": Decimal("3.00"),
            "buffered_quantity": Decimal("3.00"),
            "policy_safe_quantity": Decimal("3.00"),
            "max_order_cap": Decimal("3.00"),
            "final_quantity": Decimal("3.00"),
            "service_level_z": Decimal("1.65"),
            "target_service_level": Decimal("0.9500"),
            "service_level_source": "ingredient_target",
            "demand_source": "forecast_daily_breakdown",
            "reorder_method": "continuous_review",
            "policy_type": "stable_stocked",
            "policy_assignment_mode": "manual",
            "policy_buffer_quantity": Decimal("1.00"),
            "abc_class": "B",
            "abc_multiplier": None,
            "moq": Decimal("1.00"),
            "moq_floor": Decimal("1.00"),
            "max_allowed": Decimal("100.00"),
            "inventory_position": Decimal("2.00"),
            "should_reorder": True,
            "cadence_warnings": [],
            "assumption_warnings": [],
            "policy_review_warnings": [],
            "next_order_date": None,
            "next_delivery_date": None,
            "order_schedule_type": None,
            "review_period_days": None,
            "allowed_order_days": [],
            "allowed_delivery_days": [],
            "cadence_source": None,
            "cadence_confidence_score": None,
            "review_required": False,
            "abc_defaulted": False,
            "inventory_source": "inventory_summary",
            "inventory_conversion_fallback": False,
            "coverage_capped_by_shelf_life": False,
        },
        supplier_selection={
            "reason_code": "fallback_lowest_priority",
            "preferred_supplier_available": False,
            "selected_supplier_priority": 2,
            "selected_supplier_preferred": False,
            "pricing_available": True,
        },
        supplier_name="Dry Goods Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=Decimal("3.00"),
        pack_size=1,
        quantity_per_pack_item=Decimal("1.00"),
        packs_to_order=3,
        total_quantity_ordered=Decimal("3.00"),
        assumption_flags={"inventory_source": "inventory_summary"},
    )

    assert set(payload.keys()) == {
        "summary",
        "why_reorder",
        "quantity_factors",
        "policy_factors",
        "supplier_factors",
        "assumption_flags",
    }
    assert payload["why_reorder"]["max_target_stock"] == 5.0
    assert payload["quantity_factors"]["max_order_cap"] == 3.0


@pytest.mark.asyncio
async def test_build_explanation_payload_surfaces_projected_fefo_waste():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)

    payload = engine.build_explanation_payload(
        decision={
            "current_stock": Decimal("4.00"),
            "total_stock": Decimal("10.00"),
            "excluded_expiring_stock": Decimal("6.00"),
            "projected_waste_quantity": Decimal("6.00"),
            "usable_until_date": date(2026, 4, 17),
            "fefo_applied": True,
            "current_unit": "lb",
            "reorder_point": Decimal("8.00"),
            "lead_demand": Decimal("3.00"),
            "shelf_demand": Decimal("4.00"),
            "safety_stock": Decimal("1.00"),
            "reorder_target": Decimal("8.00"),
            "max_target_stock": Decimal("8.00"),
            "effective_lead_days": 3,
            "coverage_days": 3,
            "protection_window_days": 5,
            "raw_order_quantity": Decimal("4.00"),
            "buffered_quantity": Decimal("4.00"),
            "policy_safe_quantity": Decimal("4.00"),
            "max_order_cap": Decimal("4.00"),
            "final_quantity": Decimal("4.00"),
            "service_level_z": Decimal("1.65"),
            "target_service_level": Decimal("0.9500"),
            "service_level_source": "ingredient_target",
            "demand_source": "forecast_daily_breakdown",
            "reorder_method": "continuous_review",
            "policy_type": "stable_stocked",
            "policy_assignment_mode": "manual",
            "policy_buffer_quantity": Decimal("1.00"),
            "abc_class": "B",
            "abc_multiplier": None,
            "moq": Decimal("1.00"),
            "moq_floor": Decimal("1.00"),
            "max_allowed": Decimal("100.00"),
            "inventory_position": Decimal("4.00"),
            "should_reorder": True,
            "cadence_warnings": [],
            "assumption_warnings": [],
            "policy_review_warnings": [],
            "next_order_date": None,
            "next_delivery_date": None,
            "order_schedule_type": None,
            "review_period_days": None,
            "allowed_order_days": [],
            "allowed_delivery_days": [],
            "cadence_source": None,
            "cadence_confidence_score": None,
            "review_required": False,
            "abc_defaulted": False,
            "inventory_source": "usable_lot_projection",
            "inventory_conversion_fallback": False,
            "coverage_capped_by_shelf_life": False,
        },
        supplier_selection={
            "reason_code": "fallback_lowest_priority",
            "preferred_supplier_available": False,
            "selected_supplier_priority": 2,
            "selected_supplier_preferred": False,
            "pricing_available": True,
        },
        supplier_name="Dry Goods Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=Decimal("4.00"),
        pack_size=1,
        quantity_per_pack_item=Decimal("1.00"),
        packs_to_order=4,
        total_quantity_ordered=Decimal("4.00"),
        assumption_flags={"inventory_source": "usable_lot_projection"},
    )

    assert "projected to expire before it can be consumed" in payload["summary"]
    assert payload["why_reorder"]["projected_waste_quantity"] == 6.0
    assert payload["why_reorder"]["fefo_applied"] is True


@pytest.mark.asyncio
async def test_build_explanation_payload_for_recipe_dependent_uses_dependency_summary():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=SimpleNamespace(
            ingredient_id=3001,
            abc_class="B",
            name="Sauce Base",
            policy_type="recipe_dependent",
            policy_assignment_mode="manual",
            target_service_level=0.90,
            service_level_z=None,
            policy_override_reason=None,
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
            ingredient_id=3001,
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

    payload = engine.build_explanation_payload(
        decision=decision,
        supplier_selection={
            "reason_code": "fallback_lowest_priority",
            "preferred_supplier_available": False,
            "selected_supplier_priority": 2,
            "selected_supplier_preferred": False,
            "pricing_available": True,
        },
        supplier_name="Prep Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=decision["final_quantity"],
        pack_size=1,
        quantity_per_pack_item=Decimal("1.00"),
        packs_to_order=9,
        total_quantity_ordered=Decimal("9.00"),
        assumption_flags={"inventory_source": "inventory_summary"},
    )

    assert "Recipe-dependent ordering uses forecast-owned ingredient net requirement" in payload["summary"]
    assert "Dependency mode mixed" in payload["summary"]


@pytest.mark.asyncio
async def test_build_explanation_payload_for_intermittent_surfaces_moq_review_warning():
    engine = ReorderForecastEngine(db=MagicMock(), restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=SimpleNamespace(
            ingredient_id=3002,
            abc_class="C",
            name="Special Spice",
            policy_type="intermittent_low_turn",
            policy_assignment_mode="manual",
            target_service_level=0.88,
            service_level_z=None,
            policy_override_reason=None,
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
                ingredient_id=3002,
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

    payload = engine.build_explanation_payload(
        decision=decision,
        supplier_selection={
            "reason_code": "fallback_lowest_priority",
            "preferred_supplier_available": False,
            "selected_supplier_priority": 2,
            "selected_supplier_preferred": False,
            "pricing_available": True,
        },
        supplier_name="Reserve Vendor",
        inventory_unit="lb",
        supplier_unit="lb",
        converted_quantity_needed=decision["final_quantity"],
        pack_size=6,
        quantity_per_pack_item=Decimal("2.00"),
        packs_to_order=1,
        total_quantity_ordered=Decimal("12.00"),
        assumption_flags={"inventory_source": "inventory_summary"},
    )

    assert "Intermittent low-turn ordering uses next sparse event" in payload["summary"]
    assert "Configured MOQ materially exceeds the sparse policy-safe quantity and should be reviewed" in payload["summary"]
    warnings = payload["assumption_flags"]["cadence_warnings"]
    assert "configured MOQ exceeds stock-position cap; review required" in warnings
    assert "configured MOQ materially exceeds sparse policy-safe quantity" in warnings
    assert "pack rounding exceeds sparse policy-safe quantity" in warnings


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_includes_explanation_payload():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="full", employee_id=99)
    service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Primary Supplier"))
    service.forecast_run_ledger_repo.get_latest_finalized = AsyncMock(return_value=None)
    service.forecast_repo.get_forecasts_created_between = AsyncMock(
        return_value=[MagicMock(confidence_score=0.81, forecast_version=4)]
    )

    supplier = MagicMock(
        ingredient_supplier_id=3001,
        supplier_id=501,
        lead_time_days=3,
        unit="lb",
        min_order_quantity=12,
        pack_size=2,
        quantity_per_pack_item=6,
        cost_per_unit=Decimal("4.50"),
        preferred=True,
        supplier_priority=1,
        shelf_life_days=7,
    )
    inventory_row = MagicMock(quantity_on_hand=Decimal("5.00"), unit="lb", shelf_life_days=4)
    reorder_decision = {
        "current_stock": Decimal("5.00"),
        "current_unit": "lb",
        "lead_demand": Decimal("6.00"),
        "shelf_demand": Decimal("8.00"),
        "total_demand": Decimal("14.00"),
        "safety_stock": Decimal("2.00"),
        "reorder_point": Decimal("8.00"),
        "reorder_target": Decimal("16.00"),
        "raw_order_quantity": Decimal("11.00"),
        "buffered_quantity": Decimal("12.10"),
        "moq": Decimal("12.00"),
        "moq_floor": Decimal("12.00"),
        "max_allowed": Decimal("100.00"),
        "final_quantity": Decimal("12.10"),
        "should_reorder": True,
        "service_level_z": Decimal("1.65"),
        "abc_class": "B",
        "abc_multiplier": Decimal("1.1"),
        "abc_defaulted": False,
    }
    explanation_payload = {
        "summary": "Suggested because stock is below reorder point.",
        "why_reorder": {"current_stock": 5.0, "reorder_point": 8.0},
        "quantity_factors": {"packs_to_order": 2},
        "policy_factors": {"abc_class": "B", "service_level_z": 1.65},
        "supplier_factors": {"selection_rule": "preferred_lowest_priority"},
        "assumption_flags": {"inventory_source": "inventory_summary"},
    }

    service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[supplier])
    service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=inventory_row)

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.forecasting_engine.ForecastingEngine"
    ) as forecasting_engine_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=None))
        restaurant_repo_cls.return_value = restaurant_repo

        forecasting_engine = MagicMock()
        forecasting_engine.initialize = AsyncMock()
        forecasting_engine.run_forecasting_pipeline = AsyncMock(
            return_value={
                1001: {
                    "unit": "lb",
                    "daily_breakdown": [
                        (date.today() + timedelta(days=index), Decimal("2.00"))
                        for index in range(7)
                    ],
                }
            }
        )
        forecasting_engine_cls.return_value = forecasting_engine

        reorder_engine = MagicMock()
        reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": supplier,
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        reorder_engine.build_reorder_decision = AsyncMock(return_value=reorder_decision)
        reorder_engine.build_explanation_payload = MagicMock(return_value=explanation_payload)
        reorder_engine_cls.return_value = reorder_engine

        result = await service.generate_purchase_order_suggestions(
            horizon_days=7,
            use_cached_forecast=False,
        )

    assert result["forecast_source"] == "fresh"
    assert result["forecast_source_type"] == "on_demand"
    assert result["forecast_status"] == "ready"
    assert result["forecast_reused"] is False
    assert result["forecast_authority"] == "on_demand_preview"
    assert result["forecast_usage_action"] == "review"
    assert "preview" in result["forecast_usage_message"].lower()
    assert result["forecast_confidence_score"] == 0.81
    assert result["forecast_version"] == 4
    assert len(result["all_items"]) == 1
    item = result["all_items"][0]
    assert item["ingredient_id"] == 1001
    assert item["explanation"] == explanation_payload
    reorder_engine.build_reorder_decision.assert_awaited_once()
    reorder_engine.build_explanation_payload.assert_called_once()
    decision_kwargs = reorder_engine.build_reorder_decision.await_args.kwargs
    assert set(decision_kwargs.keys()) == {
        "ingredient_id",
        "unit",
        "lead_time",
        "daily_forecast",
        "supplier",
        "as_of_date",
        "shelf_life_days",
        "current_stock",
        "current_unit",
        "moq",
        "manage_alerts",
    }
    explanation_kwargs = reorder_engine.build_explanation_payload.call_args.kwargs
    assert explanation_kwargs["assumption_flags"]["inventory_source"] == "inventory_summary"
    assert explanation_kwargs["assumption_flags"]["lead_time_source"] == "supplier"
    assert explanation_kwargs["assumption_flags"]["moq_source"] == "supplier"


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_falls_back_to_supplier_shelf_life_when_inventory_missing_value():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="full", employee_id=99)
    service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Primary Supplier"))
    service.forecast_run_ledger_repo.get_latest_finalized = AsyncMock(return_value=None)
    service.forecast_repo.get_forecasts_created_between = AsyncMock(return_value=[])

    supplier = MagicMock(
        ingredient_supplier_id=3001,
        supplier_id=501,
        lead_time_days=3,
        unit="lb",
        min_order_quantity=12,
        pack_size=2,
        quantity_per_pack_item=6,
        cost_per_unit=Decimal("4.50"),
        preferred=True,
        supplier_priority=1,
        shelf_life_days=7,
    )
    inventory_row = MagicMock(quantity_on_hand=Decimal("5.00"), unit="lb", shelf_life_days=None)
    reorder_decision = {
        "current_stock": Decimal("5.00"),
        "current_unit": "lb",
        "lead_demand": Decimal("6.00"),
        "shelf_demand": Decimal("8.00"),
        "total_demand": Decimal("14.00"),
        "safety_stock": Decimal("2.00"),
        "reorder_point": Decimal("8.00"),
        "reorder_target": Decimal("16.00"),
        "raw_order_quantity": Decimal("11.00"),
        "buffered_quantity": Decimal("12.10"),
        "moq": Decimal("12.00"),
        "moq_floor": Decimal("12.00"),
        "max_allowed": Decimal("100.00"),
        "final_quantity": Decimal("12.10"),
        "should_reorder": True,
        "service_level_z": Decimal("1.65"),
        "abc_class": "B",
        "abc_multiplier": Decimal("1.1"),
        "abc_defaulted": False,
    }

    service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[supplier])
    service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=inventory_row)

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.forecasting_engine.ForecastingEngine"
    ) as forecasting_engine_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=None))
        restaurant_repo_cls.return_value = restaurant_repo

        forecasting_engine = MagicMock()
        forecasting_engine.initialize = AsyncMock()
        forecasting_engine.run_forecasting_pipeline = AsyncMock(
            return_value={
                1001: {
                    "unit": "lb",
                    "daily_breakdown": [
                        (date.today() + timedelta(days=index), Decimal("2.00"))
                        for index in range(7)
                    ],
                }
            }
        )
        forecasting_engine_cls.return_value = forecasting_engine

        reorder_engine = MagicMock()
        reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": supplier,
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        reorder_engine.build_reorder_decision = AsyncMock(return_value=reorder_decision)
        reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "ok"})
        reorder_engine_cls.return_value = reorder_engine

        await service.generate_purchase_order_suggestions(
            horizon_days=7,
            use_cached_forecast=False,
        )

    explanation_kwargs = reorder_engine.build_explanation_payload.call_args.kwargs
    assert explanation_kwargs["assumption_flags"]["shelf_life_source"] == "supplier"


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_includes_unspecified_supplier_when_mapping_missing():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="full", employee_id=99)
    service.forecast_run_ledger_repo.get_latest_finalized = AsyncMock(return_value=None)
    service.forecast_repo.get_forecasts_created_between = AsyncMock(return_value=[])
    service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[])
    service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(
        return_value=MagicMock(quantity_on_hand=Decimal("2.00"), unit="lb", shelf_life_days=3)
    )

    reorder_decision = {
        "current_stock": Decimal("2.00"),
        "current_unit": "lb",
        "lead_demand": Decimal("0.00"),
        "shelf_demand": Decimal("8.00"),
        "total_demand": Decimal("8.00"),
        "safety_stock": Decimal("1.00"),
        "reorder_point": Decimal("1.00"),
        "reorder_target": Decimal("9.00"),
        "raw_order_quantity": Decimal("7.00"),
        "buffered_quantity": Decimal("7.70"),
        "moq": Decimal("0.00"),
        "moq_floor": Decimal("0.00"),
        "max_allowed": Decimal("100.00"),
        "final_quantity": Decimal("7.70"),
        "should_reorder": True,
        "service_level_z": Decimal("1.65"),
        "abc_class": "C",
        "abc_multiplier": Decimal("1.0"),
        "abc_defaulted": False,
    }

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.forecasting_engine.ForecastingEngine"
    ) as forecasting_engine_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=None))
        restaurant_repo_cls.return_value = restaurant_repo

        forecasting_engine = MagicMock()
        forecasting_engine.initialize = AsyncMock()
        forecasting_engine.run_forecasting_pipeline = AsyncMock(
            return_value={
                1001: {
                    "unit": "lb",
                    "daily_breakdown": [
                        (date.today() + timedelta(days=index), Decimal("2.00"))
                        for index in range(7)
                    ],
                }
            }
        )
        forecasting_engine_cls.return_value = forecasting_engine

        reorder_engine = MagicMock()
        reorder_engine.build_reorder_decision = AsyncMock(return_value=reorder_decision)
        reorder_engine.build_explanation_payload = MagicMock(
            return_value={
                "summary": "Suggested for unspecified supplier draft.",
                "why_reorder": {"current_stock": 2.0, "current_unit": "lb", "reorder_point": 1.0},
                "quantity_factors": {"packs_to_order": 8},
                "policy_factors": {"abc_class": "C", "service_level_z": 1.65},
                "supplier_factors": {"selection_rule": "unspecified_supplier"},
                "assumption_flags": {
                    "inventory_source": "inventory_summary",
                    "lead_time_source": "no_supplier_assumed_zero",
                    "moq_source": "no_supplier_assumed_zero",
                    "shelf_life_source": "inventory",
                    "unit_conversion_fallback": False,
                    "pricing_missing": True,
                    "abc_defaulted": False,
                },
            }
        )
        reorder_engine_cls.return_value = reorder_engine

        result = await service.generate_purchase_order_suggestions(
            horizon_days=7,
            use_cached_forecast=False,
        )

    assert len(result["all_items"]) == 1
    item = result["all_items"][0]
    assert item["supplier_id"] is None
    assert item["ingredient_supplier_id"] is None
    assert item["supplier_name"] == "Unspecified supplier"
    assert item["unit_price"] == 0.0
    assert result["suggestions"][0]["supplier_id"] is None
    assert result["suggestions"][0]["supplier_name"] == "Unspecified supplier"


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_uses_recent_eod_forecast_when_fresh_run_fails():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="full", employee_id=99)
    service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Primary Supplier"))

    supplier = MagicMock(
        ingredient_supplier_id=3001,
        supplier_id=501,
        lead_time_days=3,
        unit="lb",
        min_order_quantity=12,
        pack_size=2,
        quantity_per_pack_item=6,
        cost_per_unit=Decimal("4.50"),
        preferred=True,
        supplier_priority=1,
        shelf_life_days=7,
    )
    inventory_row = MagicMock(quantity_on_hand=Decimal("5.00"), unit="lb", shelf_life_days=4)
    reorder_decision = {
        "current_stock": Decimal("5.00"),
        "current_unit": "lb",
        "lead_demand": Decimal("6.00"),
        "shelf_demand": Decimal("8.00"),
        "total_demand": Decimal("14.00"),
        "safety_stock": Decimal("2.00"),
        "reorder_point": Decimal("8.00"),
        "reorder_target": Decimal("16.00"),
        "raw_order_quantity": Decimal("11.00"),
        "buffered_quantity": Decimal("12.10"),
        "moq": Decimal("12.00"),
        "moq_floor": Decimal("12.00"),
        "max_allowed": Decimal("100.00"),
        "final_quantity": Decimal("12.10"),
        "should_reorder": True,
        "service_level_z": Decimal("1.65"),
        "abc_class": "B",
        "abc_multiplier": Decimal("1.1"),
        "abc_defaulted": False,
    }

    service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[supplier])
    service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=inventory_row)
    service._get_last_eod_ledger = AsyncMock(
        return_value=MagicMock(finalized=True, finished_at=datetime.utcnow())
    )
    service.forecast_repo.get_forecasts_created_between = AsyncMock(
        return_value=[MagicMock(confidence_score=0.77, forecast_version=2)]
    )
    service._load_cached_ingredient_forecast = AsyncMock(
        return_value={
            1001: {
                "unit": "lb",
                "daily_breakdown": [
                    (date.today() + timedelta(days=index), Decimal("2.00"))
                    for index in range(7)
                ],
            }
        }
    )

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.forecasting_engine.ForecastingEngine"
    ) as forecasting_engine_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=date.today()))
        restaurant_repo_cls.return_value = restaurant_repo

        forecasting_engine = MagicMock()
        forecasting_engine.initialize = AsyncMock()
        forecasting_engine.run_forecasting_pipeline = AsyncMock(side_effect=RuntimeError("boom"))
        forecasting_engine_cls.return_value = forecasting_engine

        reorder_engine = MagicMock()
        reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": supplier,
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        reorder_engine.build_reorder_decision = AsyncMock(return_value=reorder_decision)
        reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "fallback ok"})
        reorder_engine_cls.return_value = reorder_engine

        result = await service.generate_purchase_order_suggestions(
            horizon_days=7,
            use_cached_forecast=False,
        )

    assert result["forecast_source"] == "cached"
    assert result["forecast_source_type"] == "eod"
    assert result["forecast_status"] == "degraded"
    assert result["forecast_reused"] is True
    assert result["forecast_confidence_score"] == 0.77
    assert result["forecast_version"] == 2
    assert "Fresh forecast failed" in (result["forecast_status_message"] or "")
    assert len(result["all_items"]) == 1


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_uses_latest_finalized_forecast_when_restaurant_date_missing():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="full", employee_id=99)
    service.supplier_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Primary Supplier"))
    service.forecast_repo.get_forecasts_created_between = AsyncMock(return_value=[])

    supplier = MagicMock(
        ingredient_supplier_id=3001,
        supplier_id=501,
        lead_time_days=3,
        unit="lb",
        min_order_quantity=12,
        pack_size=2,
        quantity_per_pack_item=6,
        cost_per_unit=Decimal("4.50"),
        preferred=True,
        supplier_priority=1,
        shelf_life_days=7,
    )
    inventory_row = MagicMock(quantity_on_hand=Decimal("5.00"), unit="lb", shelf_life_days=4)
    reorder_decision = {
        "current_stock": Decimal("5.00"),
        "current_unit": "lb",
        "lead_demand": Decimal("6.00"),
        "shelf_demand": Decimal("8.00"),
        "total_demand": Decimal("14.00"),
        "safety_stock": Decimal("2.00"),
        "reorder_point": Decimal("8.00"),
        "reorder_target": Decimal("16.00"),
        "raw_order_quantity": Decimal("11.00"),
        "buffered_quantity": Decimal("12.10"),
        "moq": Decimal("12.00"),
        "moq_floor": Decimal("12.00"),
        "max_allowed": Decimal("100.00"),
        "final_quantity": Decimal("12.10"),
        "should_reorder": True,
        "service_level_z": Decimal("1.65"),
        "abc_class": "B",
        "abc_multiplier": Decimal("1.1"),
        "abc_defaulted": False,
    }
    latest_ledger = MagicMock(
        run_date=date.today(),
        finished_at=datetime.utcnow(),
        finalized=True,
    )

    service.ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[supplier])
    service.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
    service.inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=inventory_row)
    service.forecast_run_ledger_repo.get_latest_finalized = AsyncMock(return_value=latest_ledger)
    service.forecast_run_ledger_repo.get_one_by = AsyncMock(return_value=latest_ledger)
    service._load_cached_ingredient_forecast = AsyncMock(
        return_value={
            1001: {
                "unit": "lb",
                "daily_breakdown": [
                    (date.today() + timedelta(days=index), Decimal("2.00"))
                    for index in range(7)
                ],
            }
        }
    )

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=None))
        restaurant_repo_cls.return_value = restaurant_repo

        reorder_engine = MagicMock()
        reorder_engine.choose_supplier_option = AsyncMock(
            return_value={
                "supplier": supplier,
                "reason_code": "preferred_lowest_priority",
                "preferred_supplier_available": True,
                "selected_supplier_priority": 1,
                "selected_supplier_preferred": True,
                "pricing_available": True,
            }
        )
        reorder_engine.build_reorder_decision = AsyncMock(return_value=reorder_decision)
        reorder_engine.build_explanation_payload = MagicMock(return_value={"summary": "cached ok"})
        reorder_engine_cls.return_value = reorder_engine

        result = await service.generate_purchase_order_suggestions(
            horizon_days=7,
            use_cached_forecast=True,
        )

    assert result["forecast_source"] == "cached"
    assert result["forecast_source_type"] == "eod"
    assert result["forecast_status"] == "ready"
    assert result["forecast_reused"] is True
    assert result["last_eod_run_date"] == str(date.today())
    assert len(result["all_items"]) == 1
    service.forecast_run_ledger_repo.get_latest_finalized.assert_awaited()
