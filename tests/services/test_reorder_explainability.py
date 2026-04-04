from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.inventory_service import InventoryService
from app.services.reorder_forecast_engine import ReorderForecastEngine


class DummyIngredient:
    def __init__(self, ingredient_id: int, abc_class: str | None):
        self.ingredient_id = ingredient_id
        self.abc_class = abc_class
        self.name = f"Ingredient {ingredient_id}"


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

    with patch.object(engine, "calculate_safety_stock", return_value=Decimal("3.00")):
        with patch.object(engine, "calculate_max_order", return_value=Decimal("95.00")):
            decision = await engine.build_reorder_decision(
                ingredient_id=1001,
                lead_demand=Decimal("10.00"),
                shelf_demand=Decimal("15.00"),
                total_demand=Decimal("25.00"),
                unit="lb",
                lead_time=3,
                current_stock=Decimal("5.00"),
                current_unit="lb",
                moq=Decimal("10.00"),
                manage_alerts=False,
            )

    assert decision["abc_class"] == "B"
    assert decision["abc_multiplier"] == Decimal("1.1")
    assert decision["reorder_point"] == Decimal("13.00")
    assert decision["reorder_target"] == Decimal("28.00")
    assert decision["raw_order_quantity"] == Decimal("23.00")
    assert decision["buffered_quantity"] == Decimal("25.30")
    assert decision["moq_floor"] == Decimal("10.00")
    assert decision["final_quantity"] == Decimal("25.30")
    assert decision["should_reorder"] is True
    assert decision["abc_defaulted"] is False


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_includes_explanation_payload():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="master", employee_id=99)
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
    explanation_payload = {
        "summary": "Suggested because stock is below reorder point.",
        "why_reorder": {"current_stock": 5.0, "reorder_point": 8.0},
        "quantity_factors": {"packs_to_order": 2},
        "policy_factors": {"abc_class": "B", "service_level_z": 1.65},
        "supplier_factors": {"selection_rule": "preferred_lowest_priority"},
        "assumption_flags": {"inventory_source": "inventory_summary"},
    }

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.repositories.ingredient_supplier_repo.IngredientSupplierRepository"
    ) as ingredient_supplier_repo_cls, patch(
        "app.repositories.ingredients_repo.IngredientRepository"
    ) as ingredient_repo_cls, patch(
        "app.repositories.inventory_repo.InventoryRepository"
    ) as inventory_repo_cls, patch(
        "app.services.forecasting_engine.ForecastingEngine"
    ) as forecasting_engine_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=None))
        restaurant_repo_cls.return_value = restaurant_repo

        ingredient_supplier_repo = MagicMock()
        ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[supplier])
        ingredient_supplier_repo_cls.return_value = ingredient_supplier_repo

        ingredient_repo = MagicMock()
        ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
        ingredient_repo_cls.return_value = ingredient_repo

        inventory_repo = MagicMock()
        inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=inventory_row)
        inventory_repo_cls.return_value = inventory_repo

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
    assert len(result["all_items"]) == 1
    item = result["all_items"][0]
    assert item["ingredient_id"] == 1001
    assert item["explanation"] == explanation_payload
    reorder_engine.build_reorder_decision.assert_awaited_once()
    reorder_engine.build_explanation_payload.assert_called_once()
    explanation_kwargs = reorder_engine.build_explanation_payload.call_args.kwargs
    assert explanation_kwargs["assumption_flags"]["inventory_source"] == "inventory_summary"
    assert explanation_kwargs["assumption_flags"]["lead_time_source"] == "supplier"
    assert explanation_kwargs["assumption_flags"]["moq_source"] == "supplier"


@pytest.mark.asyncio
async def test_generate_purchase_order_suggestions_falls_back_to_supplier_shelf_life_when_inventory_missing_value():
    service = InventoryService(MagicMock(), restaurant_id=1, subscription_tier="master", employee_id=99)
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

    with patch("app.repositories.restaurants_repo.RestaurantRepository") as restaurant_repo_cls, patch(
        "app.repositories.ingredient_supplier_repo.IngredientSupplierRepository"
    ) as ingredient_supplier_repo_cls, patch(
        "app.repositories.ingredients_repo.IngredientRepository"
    ) as ingredient_repo_cls, patch(
        "app.repositories.inventory_repo.InventoryRepository"
    ) as inventory_repo_cls, patch(
        "app.services.forecasting_engine.ForecastingEngine"
    ) as forecasting_engine_cls, patch(
        "app.services.reorder_forecast_engine.ReorderForecastEngine"
    ) as reorder_engine_cls:
        restaurant_repo = MagicMock()
        restaurant_repo.get_by_id = AsyncMock(return_value=MagicMock(last_eod_run_date=None))
        restaurant_repo_cls.return_value = restaurant_repo

        ingredient_supplier_repo = MagicMock()
        ingredient_supplier_repo.get_all_by_ingredient_id = AsyncMock(return_value=[supplier])
        ingredient_supplier_repo_cls.return_value = ingredient_supplier_repo

        ingredient_repo = MagicMock()
        ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(name="Tomatoes"))
        ingredient_repo_cls.return_value = ingredient_repo

        inventory_repo = MagicMock()
        inventory_repo.get_inventory_by_ingredient = AsyncMock(return_value=inventory_row)
        inventory_repo_cls.return_value = inventory_repo

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
