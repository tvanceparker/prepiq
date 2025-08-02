# app/schemas/ingredients_dto.py

from pydantic import BaseModel
from typing import Optional


class IngredientBase(BaseModel):
    restaurant_id: int
    name: str
    unit: str
    category: Optional[str] = None


class IngredientCreate(IngredientBase):
    pass


class IngredientUpdate(IngredientBase):
    ingredient_id: Optional[int] = None


class Ingredient(BaseModel):
    name: str
    quantity: float
    unit: str
    type: str
    reference_id: int


class Ingredient(IngredientBase):
    ingredient_id: int

    class Config:
        orm_mode = True
