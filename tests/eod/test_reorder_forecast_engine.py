# -*- coding: utf-8 -*-


import pytest
from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

from app.services.reorder_forecast_engine import ReorderForecastEngine


@pytest.mark.asyncio
async def test_calculate_safety_stock():
    stats_service_mock = MagicMock()
    stats_service_mock.get_std_dev_usage = AsyncMock(return_value=Decimal("2.5"))

    engine = ReorderForecastEngine(db=None, restaurant_id=1)
    engine.stats_service = stats_service_mock

    result = await engine.calculate_safety_stock(
        ingredient_id=42,
        lead_time=4,
        service_level_z=Decimal("1.65"),
    )
    # 1.65 * 2.5 * sqrt(4) = 1.65 * 2.5 * 2 = 8.25
    assert result == Decimal("8.25")
@pytest.mark.asyncio
async def test_classify_abc_item_defaults_to_c():
    ingredient_repo_mock = MagicMock()
    ingredient_repo_mock.get_by_id = AsyncMock(
        return_value=type("FakeIngredient", (), {"abc_class": None})()
    )

    engine = ReorderForecastEngine(db=None, restaurant_id=1)
    engine.ingredient_repo = ingredient_repo_mock

    result = await engine.classify_abc_item(ingredient_id=1)
    assert result == "C"


@pytest.mark.asyncio
async def test_build_reorder_decision_recipe_dependent_keeps_eod_facing_entrypoint_compatible():
    engine = ReorderForecastEngine(db=None, restaurant_id=1)
    engine.alert_repo = AsyncMock()
    engine.ingredient_repo.get_by_id = AsyncMock(
        return_value=type(
            "RecipeIngredientPolicy",
            (),
            {
                "abc_class": "B",
                "policy_type": "recipe_dependent",
                "policy_assignment_mode": "manual",
                "target_service_level": 0.90,
                "service_level_z": None,
                "policy_override_reason": None,
            },
        )()
    )
    engine.recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[type("RecipeLink", (), {"recipe_id": 7001})()]
    )
    engine.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type = AsyncMock(
        return_value=[]
    )
    engine.menu_item_recipe_repo.get_by_recipe = AsyncMock(
        return_value=[type("MenuRecipeLink", (), {"menu_item_id": 9001})()]
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
    engine.calculate_max_order = AsyncMock(return_value=Decimal("100.00"))

    decision = await engine.build_reorder_decision(
        ingredient_id=1001,
        unit="lb",
        lead_time=2,
        daily_forecast=[
            (date(2026, 4, 15) + timedelta(days=index), Decimal("2.00"))
            for index in range(2)
        ],
        supplier=None,
        as_of_date=date(2026, 4, 15),
        shelf_life_days=7,
        current_stock=Decimal("1.00"),
        current_unit="lb",
        moq=Decimal("1.00"),
        manage_alerts=False,
    )

    assert decision["policy_type"] == "recipe_dependent"
    assert decision["reorder_method"] == "recipe_net_requirement_order_up_to"
