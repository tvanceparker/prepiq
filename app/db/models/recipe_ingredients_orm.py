# app/db/models/recipe_ingredients_orm.py

from sqlalchemy import Column, Integer, ForeignKey, Enum, DECIMAL, String
from app.db.session import Base
from sqlalchemy.orm import relationship, foreign
import enum


class IngredientType(str, enum.Enum):
    ingredient = "ingredient"
    batch = "batch"
    recipe = "recipe"


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    recipe_ingredient_id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(
        Integer, ForeignKey("recipes.recipe_id"), nullable=False
    )  # ForeignKey to 'recipes'
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )

    reference_id = Column(
        Integer, nullable=False
    )  # This can point to an ingredient, batch_recipe, or recipe
    ingredient_type = Column(
        Enum(IngredientType), nullable=False, default=IngredientType.ingredient
    )

    quantity_used = Column(DECIMAL(10, 2), nullable=False)
    unit = Column(String(20))
    fallback_ingredient_id = Column(Integer)

    # Relationships
    recipe = relationship(
        "Recipe", back_populates="recipe_ingredients", foreign_keys=[recipe_id]
    )
    restaurant = relationship(
        "Restaurant", back_populates="recipe_ingredients", foreign_keys=[restaurant_id]
    )

    # Conditional relationship to Ingredient table based on ingredient_type
    ingredient = relationship(
        "Ingredient",
        primaryjoin="and_(RecipeIngredient.ingredient_type == 'ingredient', foreign(RecipeIngredient.reference_id) == Ingredient.ingredient_id)",
        back_populates="recipe_ingredients",
        uselist=False,  # This is a one-to-one relationship
        overlaps="recipe_ingredients,batch_recipe",
    )

    # Conditional relationship to BatchRecipe table based on ingredient_type
    batch_recipe = relationship(
        "BatchRecipe",
        primaryjoin="and_(RecipeIngredient.ingredient_type == 'batch', foreign(RecipeIngredient.reference_id) == BatchRecipe.batch_recipe_id)",
        back_populates="recipe_ingredients",
        uselist=False,  # This is a one-to-one relationship
        overlaps="ingredient,recipe_ingredients",
    )

    source_recipe = relationship(
        "Recipe",
        primaryjoin="and_(RecipeIngredient.ingredient_type == 'recipe', foreign(RecipeIngredient.reference_id) == Recipe.recipe_id)",
        uselist=False,
        viewonly=True,
        overlaps="recipe_ingredients,recipe",
    )

