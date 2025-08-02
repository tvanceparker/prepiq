# app/schemas/recipes_dto.py

from pydantic import BaseModel
from typing import Optional, List
from app.schemas.ingredients_dto import Ingredient


class RecipeBase(BaseModel):
    restaurant_id: int
    name: str
    description: Optional[str] = None


class RecipeCreate(RecipeBase):
    pass


class RecipeUpdate(RecipeBase):
    pass


class RecipeCostingRequest(BaseModel):
    recipe_id: int
    selling_price: float
    desired_margin: float  # Desired margin as a float (e.g., 0.3 for 30%)


class Recipe(BaseModel):
    recipe_id: int
    name: str
    description: str
    ingredients: List[Ingredient]
    restaurant_id: int


class Recipe(RecipeBase):
    recipe_id: int

    class Config:
        orm_mode = True
