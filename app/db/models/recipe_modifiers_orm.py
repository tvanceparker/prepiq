# app/db/models/recipe_modifiers_orm.py

from sqlalchemy import Column, Integer, String, ForeignKey, DECIMAL, Boolean
from app.db.session import Base
from sqlalchemy.orm import relationship


class RecipeModifier(Base):
    __tablename__ = "recipe_modifiers"

    modifier_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), nullable=False)
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), nullable=False
    )
    name = Column(String(100))
    adjustment_type = Column(String(20))
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"))
    quantity_adjustment = Column(DECIMAL(10, 2))
    is_default = Column(Boolean, default=False)

    restaurant = relationship("Restaurant", back_populates="recipe_modifiers")
    recipe = relationship("Recipe", back_populates="recipe_modifiers")
    ingredient = relationship("Ingredient", back_populates="recipe_modifiers")
