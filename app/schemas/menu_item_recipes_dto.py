# app/schemas/menu_item_recipes_dto.py

from pydantic import BaseModel


class MenuItemRecipeBase(BaseModel):
    menu_item_id: int
    recipe_id: int
    restaurant_id: int


class MenuItemRecipeCreate(MenuItemRecipeBase):
    menu_item_id: int
    recipe_id: int
    restaurant_id: int


class MenuItemRecipeUpdate(MenuItemRecipeBase):
    pass


class MenuItemRecipe(MenuItemRecipeBase):
    menu_item_id: int
    recipe_id: int

    class Config:
        orm_mode = True
