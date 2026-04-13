from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.menu_service import MenuService
from app.services.prep_service import PrepService


@pytest.fixture
def menu_service(mock_db):
    transaction = AsyncMock()
    transaction.__aenter__.return_value = transaction
    transaction.__aexit__.return_value = None
    mock_db.begin = MagicMock(return_value=transaction)

    service = MenuService(mock_db, 1, "full", employee_id=7)
    service.menu_repo = AsyncMock()
    service.ingredient_repo = AsyncMock()
    service.batch_recipe_repo = AsyncMock()
    service.recipe_repo = AsyncMock()
    service.recipe_ingredient_repo = AsyncMock()
    service.menu_recipe_repo = AsyncMock()
    return service


@pytest.fixture
def prep_service(mock_db):
    transaction = AsyncMock()
    transaction.__aenter__.return_value = transaction
    transaction.__aexit__.return_value = None
    mock_db.begin = MagicMock(return_value=transaction)

    service = PrepService(mock_db, 1, "full", employee_id=7)
    service.batch_recipe_repo = AsyncMock()
    service.batch_recipe_ingredient_repo = AsyncMock()
    service.ingredient_repo = AsyncMock()
    service.recipe_repo = AsyncMock()
    service.recipe_ingredient_repo = AsyncMock()
    service.prep_schedule_repo = AsyncMock()
    service.inventory_lot_repo = AsyncMock()
    return service


@pytest.mark.asyncio
async def test_update_recipe_with_ingredients_rejects_incompatible_units(menu_service):
    menu_service.ingredient_repo.get_by_id.return_value = MagicMock(unit="lb")

    with pytest.raises(ValueError, match="incompatible"):
        await menu_service.update_recipe_with_ingredients(
            {
                "name": "Soup Base",
                "description": "Test",
                "ingredients": [
                    {
                        "reference_id": 101,
                        "type": "ingredient",
                        "quantity": Decimal("1.0"),
                        "unit": "ml",
                    }
                ],
            }
        )

    menu_service.recipe_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_delete_recipe_rejects_when_recipe_is_still_linked(menu_service):
    menu_service.menu_recipe_repo.get_by_recipe.return_value = [MagicMock(), MagicMock()]
    menu_service.recipe_repo.get_by_id.return_value = MagicMock(recipe_id=55, name="Burger", is_active=True)
    menu_service.menu_repo.get_by_id.side_effect = [
        MagicMock(menu_item_id=1, name="Burger Plate", is_active=True),
        MagicMock(menu_item_id=2, name="Lunch Combo", is_active=True),
    ]
    menu_service.recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = []

    result = await menu_service.delete_recipe(55)

    assert result["archived"] is True
    assert result["usage"]["menu_item_count"] == 2
    menu_service.recipe_repo.update.assert_awaited_once_with(55, {"is_active": False})


@pytest.mark.asyncio
async def test_update_recipe_with_ingredients_rejects_nested_recipe_cycles(menu_service):
    menu_service.recipe_repo.get_by_id.side_effect = [
        MagicMock(recipe_id=10),
        MagicMock(recipe_id=20),
    ]
    menu_service.recipe_ingredient_repo.get_by_recipe_id.return_value = [
        MagicMock(ingredient_type="recipe", reference_id=10)
    ]

    with pytest.raises(ValueError, match="create a cycle"):
        await menu_service.update_recipe_with_ingredients(
            {
                "recipe_id": 10,
                "name": "Burger Combo",
                "description": "Test",
                "ingredients": [
                    {
                        "reference_id": 20,
                        "type": "recipe",
                        "quantity": Decimal("1.0"),
                        "unit": "portion",
                    }
                ],
            }
        )


@pytest.mark.asyncio
async def test_update_recipe_with_ingredients_rejects_archived_batch_reference(menu_service):
    archived_batch = MagicMock(batch_recipe_id=30, yield_unit="liter")
    archived_batch.is_active = False
    menu_service.batch_recipe_repo.get_by_id.return_value = archived_batch

    with pytest.raises(ValueError, match="archived and cannot be reused"):
        await menu_service.update_recipe_with_ingredients(
            {
                "recipe_id": 10,
                "name": "Sauce",
                "description": "Test",
                "ingredients": [
                    {
                        "reference_id": 30,
                        "type": "batch",
                        "quantity": Decimal("1.0"),
                        "unit": "liter",
                    }
                ],
            }
        )

    menu_service.recipe_repo.update.assert_not_called()


@pytest.mark.asyncio
async def test_update_recipe_with_ingredients_rejects_archived_recipe_update(menu_service):
    archived_recipe = MagicMock(recipe_id=10, name="Sauce", description="Old")
    archived_recipe.is_active = False
    menu_service.recipe_repo.get_by_id.return_value = archived_recipe

    with pytest.raises(ValueError, match="Archived recipes cannot be updated"):
        await menu_service.update_recipe_with_ingredients(
            {
                "recipe_id": 10,
                "name": "Sauce",
                "description": "Updated",
                "ingredients": [],
            }
        )

    menu_service.recipe_repo.update.assert_not_called()


@pytest.mark.asyncio
async def test_delete_recipe_rejects_when_recipe_is_nested_in_other_recipe(menu_service):
    menu_service.menu_recipe_repo.get_by_recipe.return_value = []
    async def get_recipe_by_id(recipe_id):
        if recipe_id == 55:
            return MagicMock(recipe_id=55, name="Sauce", is_active=True)
        if recipe_id == 77:
            return MagicMock(recipe_id=77, name="Combo", is_active=True)
        return None

    menu_service.recipe_repo.get_by_id.side_effect = get_recipe_by_id
    menu_service.recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = [MagicMock(recipe_id=77)]

    result = await menu_service.delete_recipe(55)

    assert result["archived"] is True
    assert result["usage"]["nested_recipe_count"] == 1
    assert result["lifecycle_action"] == "archive"
    menu_service.recipe_repo.update.assert_awaited_once_with(55, {"is_active": False})


@pytest.mark.asyncio
async def test_create_batch_recipe_rejects_missing_batch_reference(prep_service):
    prep_service.batch_recipe_repo.get_by_id.return_value = None

    with pytest.raises(ValueError, match="Batch recipe reference 20 not found"):
        await prep_service.create_batch_recipe(
            name="Sauce",
            description=None,
            yield_quantity=Decimal("2.0"),
            yield_unit="liter",
            estimated_prep_time_minutes=None,
            shelf_life_days=3,
            ingredients=[
                {
                    "reference_id": 20,
                    "ingredient_type": "batch",
                    "quantity_used": Decimal("1.0"),
                    "unit": "liter",
                }
            ],
        )

    prep_service.batch_recipe_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_create_batch_recipe_rejects_archived_ingredient_reference(prep_service):
    archived_ingredient = MagicMock(ingredient_id=20, unit="liter")
    archived_ingredient.is_active = False
    prep_service.ingredient_repo.get_by_id.return_value = archived_ingredient

    with pytest.raises(ValueError, match="archived and cannot be reused"):
        await prep_service.create_batch_recipe(
            name="Sauce",
            description=None,
            yield_quantity=Decimal("2.0"),
            yield_unit="liter",
            estimated_prep_time_minutes=None,
            shelf_life_days=3,
            ingredients=[
                {
                    "reference_id": 20,
                    "ingredient_type": "ingredient",
                    "quantity_used": Decimal("1.0"),
                    "unit": "liter",
                }
            ],
        )

    prep_service.batch_recipe_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_update_batch_recipe_rejects_cycles(prep_service):
    prep_service.batch_recipe_repo.get_by_id.side_effect = [
        MagicMock(batch_recipe_id=10, yield_unit="liter"),
        MagicMock(batch_recipe_id=20, yield_unit="liter"),
    ]
    prep_service.batch_recipe_ingredient_repo.get_by_batch_recipe_id.return_value = [
        MagicMock(ingredient_type="batch", reference_id=10)
    ]

    with pytest.raises(ValueError, match="create a cycle"):
        await prep_service.update_batch_recipe(
            batch_recipe_id=10,
            ingredients=[
                {
                    "reference_id": 20,
                    "ingredient_type": "batch",
                    "quantity_used": Decimal("1.0"),
                    "unit": "liter",
                }
            ],
        )

    prep_service.batch_recipe_ingredient_repo.delete_all_by_batch_recipe_id.assert_not_called()


@pytest.mark.asyncio
async def test_create_batch_recipe_rejects_recipe_component_type(prep_service):
    with pytest.raises(
        ValueError,
        match="Batch recipe components only support ingredient or batch references",
    ):
        await prep_service.create_batch_recipe(
            name="Mother Sauce",
            description=None,
            yield_quantity=Decimal("2.0"),
            yield_unit="liter",
            estimated_prep_time_minutes=None,
            shelf_life_days=3,
            ingredients=[
                {
                    "reference_id": 200,
                    "ingredient_type": "recipe",
                    "quantity_used": Decimal("1.0"),
                    "unit": "liter",
                }
            ],
        )

    prep_service.batch_recipe_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_update_batch_recipe_rejects_incompatible_parent_recipe_unit(prep_service):
    prep_service.batch_recipe_repo.get_by_id.return_value = MagicMock(
        batch_recipe_id=10,
        yield_unit="liter",
    )
    prep_service.recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = [
        MagicMock(recipe_id=55, unit="liter")
    ]
    recipe = MagicMock(recipe_id=55)
    recipe.name = "Soup Base"
    prep_service.recipe_repo.get_by_id.return_value = recipe
    prep_service.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = []

    with pytest.raises(ValueError, match="Soup Base references this batch"):
        await prep_service.update_batch_recipe(
            batch_recipe_id=10,
            yield_unit="lb",
        )

    prep_service.batch_recipe_repo.update.assert_not_called()


@pytest.mark.asyncio
async def test_update_batch_recipe_rejects_archived_batch_update(prep_service):
    archived_batch = MagicMock(batch_recipe_id=10, yield_unit="liter")
    archived_batch.is_active = False
    prep_service.batch_recipe_repo.get_by_id.return_value = archived_batch

    with pytest.raises(ValueError, match="Archived batch recipes cannot be updated"):
        await prep_service.update_batch_recipe(batch_recipe_id=10, yield_unit="liter")

    prep_service.batch_recipe_repo.update.assert_not_called()


@pytest.mark.asyncio
async def test_delete_batch_recipe_rejects_when_dependencies_exist(prep_service):
    prep_service.batch_recipe_repo.get_by_id.side_effect = [
        MagicMock(batch_recipe_id=10, name="Queso", is_active=True),
        MagicMock(batch_recipe_id=10, name="Queso", is_active=True),
        MagicMock(batch_recipe_id=44, name="Nacho Batch", is_active=True),
    ]
    prep_service.recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = [
        MagicMock(recipe_id=33)
    ]
    prep_service.recipe_repo.get_by_id.return_value = MagicMock(recipe_id=33, name="Nachos", is_active=True)
    prep_service.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = [MagicMock(batch_recipe_id=44)]
    prep_service.prep_schedule_repo.get_by_field.return_value = [MagicMock(), MagicMock()]
    prep_service.inventory_lot_repo.get_all_by_batch_recipe_id.return_value = [MagicMock()]

    result = await prep_service.delete_batch_recipe(10)

    assert result["archived"] is True
    assert result["usage"]["recipe_count"] == 1
    assert result["usage"]["batch_count"] == 1
    assert result["usage"]["prep_schedule_count"] == 2
    assert result["usage"]["inventory_lot_count"] == 1
    assert result["lifecycle_action"] == "archive"
    prep_service.batch_recipe_repo.update.assert_awaited_once_with(10, {"is_active": False})