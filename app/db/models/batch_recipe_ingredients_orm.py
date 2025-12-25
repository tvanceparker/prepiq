# app/db/models/batch_recipe_ingredients_orm.py

from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, String, Enum
from sqlalchemy.orm import relationship, foreign
from app.db.session import Base
import enum


class BatchIngredientType(str, enum.Enum):
    """Type of component in a batch recipe - raw ingredient or another batch"""
    ingredient = "ingredient"
    batch = "batch"


class BatchRecipeIngredient(Base):
    __tablename__ = "batch_recipe_ingredients"

    batch_recipe_ingredient_id = Column(Integer, primary_key=True, index=True)
    batch_recipe_id = Column(
        Integer, ForeignKey("batch_recipes.batch_recipe_id"), nullable=False, index=True
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    # reference_id points to either ingredient_id or another batch_recipe_id
    reference_id = Column(Integer, nullable=False)
    ingredient_type = Column(
        Enum(BatchIngredientType), nullable=False, default=BatchIngredientType.ingredient
    )
    quantity_used = Column(DECIMAL(10, 2))
    unit = Column(String(20))

    # Relationships
    batch_recipe = relationship(
        "BatchRecipe", back_populates="batch_recipe_ingredients",
        foreign_keys=[batch_recipe_id]
    )
    restaurant = relationship("Restaurant", back_populates="batch_recipe_ingredients")

    # Conditional relationship to Ingredient (when ingredient_type='ingredient')
    ingredient = relationship(
        "Ingredient",
        primaryjoin="and_(BatchRecipeIngredient.ingredient_type == 'ingredient', foreign(BatchRecipeIngredient.reference_id) == Ingredient.ingredient_id)",
        back_populates="batch_recipe_ingredients",
        uselist=False,
    )

    # Conditional relationship to source BatchRecipe (when ingredient_type='batch')
    source_batch = relationship(
        "BatchRecipe",
        primaryjoin="and_(BatchRecipeIngredient.ingredient_type == 'batch', foreign(BatchRecipeIngredient.reference_id) == BatchRecipe.batch_recipe_id)",
        uselist=False,
        viewonly=True,
    )
