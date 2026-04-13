from collections import defaultdict
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.forecasting_engine import ForecastingEngine
from app.services.utils.inventory_deduction_helper import InventoryDeductionHelper


def _aggregate_quantities(rows, key_field):
    totals = defaultdict(Decimal)
    for row in rows:
        totals[row[key_field]] += Decimal(str(row["quantity"]))
    return dict(totals)


@pytest.mark.asyncio
async def test_forecast_and_deduction_match_nested_recipe_graph(mock_db):
    engine = ForecastingEngine(mock_db, 1, "full")
    helper = InventoryDeductionHelper(mock_db, 1, "full", employee_id=7)

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
        return MagicMock(
            batch_recipe_id=batch_recipe_id,
            yield_quantity=Decimal("10.0") if batch_recipe_id == 501 else Decimal("8.0"),
            yield_unit="count",
        )

    engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(
        return_value=[MagicMock(recipe_id=10)]
    )
    engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(
        return_value=[10]
    )
    engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
        side_effect=get_recipe_components
    )
    engine.batch_recipe_repo.get_by_id = AsyncMock(side_effect=get_batch)
    engine.ingredient_repo.get_by_id = AsyncMock(
        side_effect=lambda ingredient_id: MagicMock(unit="count")
    )

    helper.menu_item_recipe_repo.get_by_menu_item = AsyncMock(
        return_value=[MagicMock(recipe_id=10)]
    )
    helper.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
        side_effect=get_recipe_components
    )
    helper.batch_recipe_repo.get_by_id = AsyncMock(side_effect=get_batch)
    helper.ingredient_repo.get_by_id = AsyncMock(
        side_effect=lambda ingredient_id: MagicMock(unit="count")
    )

    forecast_breakdown = await engine.generate_batch_recipe_breakdown(
        {99: {"daily_breakdown": [(date(2026, 4, 13), 4.0)]}}
    )
    usage_summary = await helper._build_usage_summary(
        [{"menu_item_id": 99, "quantity": 4}]
    )

    forecast_batches = {
        entry["batch_recipe_id"]: Decimal(str(entry["required_quantity"]))
        for entry in forecast_breakdown
    }
    deduction_batches = {
        entry["batch_recipe_id"]: Decimal(str(entry["quantity"]))
        for entry in usage_summary
        if entry.get("source") == "batch"
    }
    deduction_ingredients = {
        entry["ingredient_id"]: Decimal(str(entry["quantity"]))
        for entry in usage_summary
        if entry.get("source") == "sale"
    }

    assert forecast_batches == {501: Decimal("12.0"), 502: Decimal("8.0")}
    assert forecast_batches == deduction_batches
    assert deduction_ingredients == {
        1001: Decimal("4.0"),
        1002: Decimal("4.0"),
    }


@pytest.mark.asyncio
async def test_generate_ingredient_breakdown_expands_nested_batch_components(mock_db):
    engine = ForecastingEngine(mock_db, 1, "full")

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

    engine.menu_item_recipe_repo.get_by_menu_item = AsyncMock(
        return_value=[MagicMock(recipe_id=10)]
    )
    engine.menu_item_recipe_repo.get_recipe_ids_for_menu_item = AsyncMock(
        return_value=[10]
    )
    engine.recipe_ingredient_repo.get_by_recipe_id = AsyncMock(
        side_effect=get_recipe_components
    )
    engine.batch_recipe_repo.get_by_id = AsyncMock(side_effect=get_batch)
    engine.batch_recipe_ingredients_repo.get_by_batch_recipe_id = AsyncMock(
        side_effect=get_batch_components
    )
    engine.ingredient_repo.get_by_id = AsyncMock(
        side_effect=lambda ingredient_id: MagicMock(unit="count")
    )

    forecast_breakdown = [{
        "menu_item_id": 99,
        "forecast_date": date(2026, 4, 13),
        "predicted_quantity": 4.0,
    }]
    batch_breakdown = await engine.generate_batch_recipe_breakdown(
        {99: {"daily_breakdown": [(date(2026, 4, 13), 4.0)]}}
    )
    ingredient_breakdown = await engine.generate_ingredient_breakdown(
        forecast_breakdown,
        batch_breakdown,
    )

    totals = _aggregate_quantities(ingredient_breakdown, "ingredient_id")

    assert totals == {
        1001: Decimal("4.0"),
        1002: Decimal("4.0"),
        1003: Decimal("4.8"),
        1004: Decimal("6.0"),
        1005: Decimal("4.8"),
    }