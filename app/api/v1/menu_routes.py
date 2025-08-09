# app/api/v1/menu_routes.py

from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, Path, Body
from app.services.menu_service import MenuService
from app.api.dependencies import get_menu_service, get_current_user
from app.schemas.menu_dto import (
    MenuItemCreate,
    MenuItemUpdateRequest,
    IngredientCreate,
    RecipeWithIngredientsDTO,
    RecipeBase,
    Recipe,
    RecipeCostingRequest,
)
from app.api.dependencies import get_restaurant_id

router = APIRouter(prefix="/menu", tags=["Menu"])


@router.get("/get_menu_items")
async def get_menu_items(menu_service: MenuService = Depends(get_menu_service)):
    return await menu_service.get_all_menu_items()


@router.get("/batch_recipes/get_all_batch_recipes")
async def get_all_batch_recipes(menu_service: MenuService = Depends(get_menu_service)):
    return await menu_service.get_all_batch_recipes()


@router.get("/ingredients/get_all_ingredients")
async def get_ingredients(menu_service: MenuService = Depends(get_menu_service)):
    return await menu_service.get_all_ingredients()


@router.get("/recipes/get_recipes")
async def get_recipes(menu_service: MenuService = Depends(get_menu_service)):
    return await menu_service.get_all_recipes()


@router.get("/ingredients/with-suppliers")
async def get_ingredients_with_suppliers(
    menu_service: MenuService = Depends(get_menu_service),
):
    return await menu_service.get_ingredients_with_suppliers()


@router.post("/ingredients/upsert")
async def upsert_ingredient(
    ingredient_data: dict, menu_service: MenuService = Depends(get_menu_service)
):
    return await menu_service.upsert_ingredient_with_suppliers(ingredient_data)


# @router.post("/recipes")
# async def create_recipe_with_ingredients(
#     recipe_dict: dict, menu_service: MenuService = Depends(get_menu_service)
# ):
#     return await menu_service.update_recipe_with_ingredients(recipe_dict)


@router.post("/create")
async def create_menu_item(
    menu_dict: dict, menu_service: MenuService = Depends(get_menu_service)
):
    return await menu_service.create_menu_item(menu_dict)


@router.get("/recipes_with_ingredients")
async def list_recipes(service: MenuService = Depends(get_menu_service)):
    return await service.get_all_recipes_with_ingredients()


@router.patch("/recipes/{recipe_id}")
async def update_recipe_with_ingredients(
    recipe_id: int,
    recipe_dict: dict,
    menu_service: MenuService = Depends(get_menu_service),
):
    recipe_dict["recipe_id"] = recipe_id
    return await menu_service.update_recipe_with_ingredients(recipe_dict)

@router.post("/recipes")
async def create_recipe(
    recipe_dict: dict,
    menu_service: MenuService = Depends(get_menu_service),
):
    # Remove recipe_id from the dict if it exists to avoid confusion
    recipe_dict.pop("recipe_id", None)
    return await menu_service.update_recipe_with_ingredients(recipe_dict)


@router.patch("/menu_items/{menu_item_id}")
async def update_menu_item(
    menu_item_id: int = Path(..., description="ID of the menu item to update"),
    update_data: MenuItemUpdateRequest = Body(...),
    restaurant_id: int = Depends(get_restaurant_id),
    menu_service: MenuService = Depends(get_menu_service),
):
    return await menu_service.update_menu_item(
        menu_item_id=menu_item_id,
        restaurant_id=restaurant_id,
        name=update_data.name,
        price=update_data.price,
        category=update_data.category,
        is_active=update_data.is_active,
        recipes=update_data.recipes,
    )

@router.delete("/recipes/{recipe_id}")
async def delete_recipe(
    recipe_id: int,
    menu_service: MenuService = Depends(get_menu_service),
):
    try:
        response = await menu_service.delete_recipe(recipe_id)
        return {"message": response["message"], "deleted_ingredients_count": response["deleted_ingredients_count"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail= f"Something went wrong: {e}")
