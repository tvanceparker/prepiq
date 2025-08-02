# app/schemas/recipe_modifiers_dto.py

from pydantic import BaseModel
from typing import Optional


class RecipeModifierBase(BaseModel):
    restaurant_id: int
    recipe_id: int
    name: Optional[str] = None
    adjustment_type: Optional[str] = None
    ingredient_id: Optional[int] = None
    quantity_adjustment: Optional[float] = None
    is_default: Optional[bool] = False


class RecipeModifierCreate(RecipeModifierBase):
    pass


class RecipeModifierUpdate(RecipeModifierBase):
    pass


class RecipeModifier(RecipeModifierBase):
    modifier_id: int

    class Config:
        orm_mode = True
