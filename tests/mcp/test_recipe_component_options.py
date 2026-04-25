from types import SimpleNamespace

import pytest

from app.mcp_server.auth import MCPActorContext
from app.mcp_server.schemas import ListRecipeComponentOptionsInput
from app.mcp_server.service_adapters import MCPServiceAdapters


class FakeIngredientRepo:
    async def get_all(self, limit=100):
        assert limit == 500
        return [
            SimpleNamespace(
                ingredient_id=101,
                name="Tomato",
                unit="lb",
                category="Produce",
            ),
            SimpleNamespace(
                ingredient_id=102,
                name="Sauce Salt",
                unit="oz",
                category="Dry Goods",
            ),
        ]


class FakeBatchRecipeRepo:
    async def get_active(self):
        return [
            SimpleNamespace(
                batch_recipe_id=201,
                name="Red Sauce",
                description="House tomato sauce",
                yield_unit="qt",
                yield_quantity=4,
            )
        ]


class FakeRecipeRepo:
    async def get_active(self):
        return [
            SimpleNamespace(recipe_id=301, name="Pizza", description="Archive target"),
            SimpleNamespace(recipe_id=302, name="Sauce Plate", description="Menu recipe"),
        ]


class FakeMenuService:
    ingredient_repo = FakeIngredientRepo()
    batch_recipe_repo = FakeBatchRecipeRepo()
    recipe_repo = FakeRecipeRepo()


@pytest.fixture
def adapters():
    actor = MCPActorContext(
        username="manager",
        restaurant_id=1,
        subscription_tier="full",
        employee_id=7,
        name="Manager",
        role_id=3,
    )
    adapter = MCPServiceAdapters(db=SimpleNamespace(), actor=actor)
    adapter.menu_service = lambda: FakeMenuService()
    return adapter


@pytest.mark.asyncio
async def test_recipe_component_options_return_live_ids_units_and_filters(adapters):
    result = await adapters.list_recipe_component_options(
        ListRecipeComponentOptionsInput(
            query="sauce",
            exclude_recipe_id=302,
            limit_per_type=10,
        )
    )

    assert result["component_contract"]["reference_id"].startswith("Use ingredient_id")
    assert result["ingredients"] == [
        {
            "component_type": "ingredient",
            "reference_id": 102,
            "source_id_field": "ingredient_id",
            "name": "Sauce Salt",
            "source_unit": "oz",
            "category": "Dry Goods",
            "usable_for_recipe": True,
            "usable_for_batch_recipe": True,
        }
    ]
    assert result["batch_recipes"][0]["reference_id"] == 201
    assert result["batch_recipes"][0]["source_unit"] == "qt"
    assert result["recipes"] == []
    assert result["counts"] == {
        "ingredients": 1,
        "batch_recipes": 1,
        "recipes": 0,
    }


@pytest.mark.asyncio
async def test_recipe_component_options_can_limit_to_ingredients(adapters):
    result = await adapters.list_recipe_component_options(
        ListRecipeComponentOptionsInput(component_types=["ingredient"], limit_per_type=1)
    )

    assert list(result["counts"].keys()) == ["ingredients"]
    assert len(result["ingredients"]) == 1
    assert "batch_recipes" not in result
    assert "recipes" not in result
