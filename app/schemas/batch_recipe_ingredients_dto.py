# app/schemas/batch_recipe_ingredients_dto.py

from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class BatchRecipeIngredientBase(BaseModel):
    batch_recipe_id: int
    ingredient_id: int
    restaurant_id: int
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None


class BatchRecipeIngredientCreate(BatchRecipeIngredientBase):
    restaurant_id: int
    batch_recipe_id: int
    ingredient_id: int
    quantity_used: Decimal
    unit: str


class BatchRecipeIngredientUpdate(BaseModel):
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None


class BatchRecipeIngredient(BatchRecipeIngredientBase):
    class Config:
        orm_mode = True
