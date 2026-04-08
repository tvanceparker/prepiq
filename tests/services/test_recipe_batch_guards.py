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

    with pytest.raises(ValueError, match="2 menu item\(s\)"):
        await menu_service.delete_recipe(55)

    menu_service.recipe_ingredient_repo.delete_by_recipe_id.assert_not_called()


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
async def test_delete_recipe_rejects_when_recipe_is_nested_in_other_recipe(menu_service):
    menu_service.menu_recipe_repo.get_by_recipe.return_value = []
    menu_service.recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = [MagicMock()]

    with pytest.raises(ValueError, match="nested recipe"):
        await menu_service.delete_recipe(55)

    menu_service.recipe_repo.delete.assert_not_called()


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
async def test_delete_batch_recipe_rejects_when_dependencies_exist(prep_service):
    prep_service.batch_recipe_repo.get_by_id.return_value = MagicMock(batch_recipe_id=10)
    prep_service.recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = [
        MagicMock()
    ]
    prep_service.batch_recipe_ingredient_repo.get_all_by_reference_id_and_type.return_value = []
    prep_service.prep_schedule_repo.get_by_field.return_value = []
    prep_service.inventory_lot_repo.get_all_by_batch_recipe_id.return_value = []

    with pytest.raises(ValueError, match="recipe reference"):
        await prep_service.delete_batch_recipe(10)

    prep_service.batch_recipe_repo.delete.assert_not_called()