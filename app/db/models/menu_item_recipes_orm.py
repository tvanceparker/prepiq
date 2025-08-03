# db/models/menu_item_recipes_orm.py

from sqlalchemy import Column, Integer, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class MenuItemRecipe(Base):
    __tablename__ = "menu_item_recipes"

    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), primary_key=True
    )
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), primary_key=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )

    menu_item = relationship("MenuItem", back_populates="menu_item_recipes")
    recipe = relationship("Recipe", back_populates="menu_item_recipes")
    restaurant = relationship("Restaurant", back_populates="menu_item_recipes")
