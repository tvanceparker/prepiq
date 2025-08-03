# db/models/recipes_orm.py

from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class Recipe(Base):
    __tablename__ = "recipes"

    recipe_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # Relationship with Restaurant
    restaurant = relationship("Restaurant", back_populates="recipes")

    # Relationship with RecipeIngredient (updated for new schema)
    recipe_ingredients = relationship(
        "RecipeIngredient",
        back_populates="recipe",
        cascade="all, delete-orphan",
        foreign_keys="[RecipeIngredient.recipe_id]",  # Make sure foreign_keys is pointing to the correct column
    )

    # Other relationships
    menu_item_recipes = relationship(
        "MenuItemRecipe", back_populates="recipe", cascade="all, delete-orphan"
    )

    recipe_modifiers = relationship("RecipeModifier", back_populates="recipe")
