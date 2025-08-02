# app/schemas/batch_recipes_dto.py

from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal


class BatchRecipeBase(BaseModel):
    restaurant_id: int
    name: str
    description: Optional[str] = None
    yield_quantity: Optional[Decimal] = None
    yield_unit: Optional[str] = None
    estimated_prep_time_minutes: Optional[int] = None
    shelf_life_days: Optional[int] = None


class BatchRecipeIngredientUpdate(BaseModel):
    ingredient_id: int
    quantity_used: Decimal
    unit: str


class BatchRecipeUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    yield_quantity: Optional[Decimal] = None
    yield_unit: Optional[str] = None
    estimated_prep_time_minutes: Optional[int] = None
    shelf_life_days: Optional[int] = None
    ingredients: Optional[List[BatchRecipeIngredientUpdate]] = None


class IngredientInput(BaseModel):
    ingredient_id: int
    quantity_used: Decimal
    unit: str


class CreateBatchRecipeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    yield_quantity: Decimal
    yield_unit: str
    estimated_prep_time_minutes: Optional[int] = None
    shelf_life_days: Optional[int] = None
    ingredients: List[IngredientInput]


class BatchRecipeCreate(BatchRecipeBase):
    pass


class BatchRecipeUpdate(BatchRecipeBase):
    pass


class BatchRecipe(BatchRecipeBase):
    batch_recipe_id: int

    class Config:
        orm_mode = True
