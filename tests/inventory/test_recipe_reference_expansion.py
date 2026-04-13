from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.forecasting_engine import ForecastingEngine
from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper


@pytest.mark.asyncio
async def test_forecasting_engine_expands_nested_recipe_batch_requirements(mock_db):
    engine = ForecastingEngine(mock_db, 1, "full")
    engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[MagicMock(recipe_id=10)])

    async def get_recipe_components(recipe_id):
        if recipe_id == 10:
            return [MagicMock(ingredient_type="recipe", reference_id=20, quantity_used=Decimal("2.0"))]
        if recipe_id == 20:
            return [MagicMock(ingredient_type="batch", reference_id=501, quantity_used=Decimal("1.5"))]
        return []

    engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(side_effect=get_recipe_components)

    result = await engine.generate_batch_recipe_breakdown(
        {101: {"daily_breakdown": [(date(2026, 4, 8), 3.0)]}}
    )

    assert result == [
        {
            "batch_recipe_id": 501,
            "forecast_date": date(2026, 4, 8),
            "required_quantity": 9.0,
        }
    ]


@pytest.mark.asyncio
async def test_inventory_deduction_helper_expands_nested_recipe_usage(mock_db):
    helper = InventoryDeductionHelper(mock_db, 1, "full", employee_id=7)
    helper.menu_item_recipe_repo.get_by_menu_item = AsyncMock(return_value=[MagicMock(recipe_id=10)])

    async def get_recipe_components(recipe_id):
        if recipe_id == 10:
            return [MagicMock(ingredient_type="recipe", reference_id=20, quantity_used=Decimal("2.0"))]
        if recipe_id == 20:
            return [MagicMock(ingredient_type="ingredient", reference_id=1001, quantity_used=Decimal("0.5"))]
        return []

    helper.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(side_effect=get_recipe_components)
    helper.ingredient_repo.get_by_id = AsyncMock(return_value=MagicMock(unit="lb"))

    summary = await helper._build_usage_summary(
        [{"menu_item_id": 99, "quantity": 4}]
    )

    assert summary == [
        {
            "ingredient_id": 1001,
            "quantity": Decimal("4.0"),
            "unit": "lb",
            "source": "sale",
        }
    ]