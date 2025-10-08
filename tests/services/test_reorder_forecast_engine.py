import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, call

from app.services.reorder_forecast_engine import ReorderForecastEngine


class DummyIngredient:
    def __init__(self, ingredient_id: int, unit_cost: Decimal, abc_class: str | None):
        self.ingredient_id = ingredient_id
        self.unit_cost = unit_cost
        self.abc_class = abc_class
        self.name = f"Ingredient {ingredient_id}"


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