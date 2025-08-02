# app/schemas/recipe_ingredients_dto.py

from pydantic import BaseModel
from typing import Optional, List
from app.schemas.recipes_dto import RecipeCreate


class RecipeIngredientBase(
    BaseModel
):  # TODO NEED TO CHANGE THIS DTO TO HANDLE both batch and ingredient, dont know how
    recipe_id: int  # ID of the recipe this ingredient belongs to
    restaurant_id: int  # ID of the restaurant this ingredient belongs to
    ingredient_id: Optional[int] = (
        None  # Optional ID for the ingredient (can be used if it's an ingredient)
    )
    quantity_used: float  # The quantity used for the recipe
    unit: Optional[str] = None  # Unit of measurement for the quantity (e.g., kg, tsp)

    # Validation to ensure only one of ingredient_id or sub_recipe_id is present can be added here
    class Config:
        orm_mode = True  # Tells Pydantic to treat ORM models like dictionaries (useful for databases)


class RecipeIngredientCreate(RecipeIngredientBase):
    # This is used for creating new recipe ingredients
    pass


class RecipeIngredientUpdate(RecipeIngredientBase):
    # This is used for updating existing recipe ingredients
    pass


class RecipeWithIngredientsDTO(BaseModel):
    # DTO for including recipe along with its ingredients
    recipe: RecipeCreate  # Recipe DTO, which is used when creating a new recipe
    ingredients: List[RecipeIngredientCreate]  # A list of ingredients for the recipe


class RecipeIngredient(RecipeIngredientBase):
    recipe_ingredient_id: int  # The ID of the specific recipe ingredient

    class Config:
        orm_mode = True  # Tells Pydantic to treat ORM models like dictionaries (useful for databases)
