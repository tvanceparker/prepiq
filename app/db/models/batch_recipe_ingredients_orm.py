# app/db/models/batch_recipe_ingredients_orm.py

from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, String
from sqlalchemy.orm import relationship
from app.db.session import Base


class BatchRecipeIngredient(Base):
    __tablename__ = "batch_recipe_ingredients"

    batch_recipe_id = Column(
        Integer, ForeignKey("batch_recipes.batch_recipe_id"), primary_key=True
    )
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), primary_key=True
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    quantity_used = Column(DECIMAL(10, 2))
    unit = Column(String(20))

    batch_recipe = relationship(
        "BatchRecipe", back_populates="batch_recipe_ingredients"
    )
    ingredient = relationship("Ingredient", back_populates="batch_recipe_ingredients")
    restaurant = relationship("Restaurant", back_populates="batch_recipe_ingredients")
