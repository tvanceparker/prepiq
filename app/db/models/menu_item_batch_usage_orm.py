# app/db/models/menu_item_batch_usage_orm.py

from sqlalchemy import Column, Integer, ForeignKey, DECIMAL, String
from sqlalchemy.orm import relationship
from app.db.session import Base


class MenuItemBatchUsage(Base):
    __tablename__ = "menu_item_batch_usage"

    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), primary_key=True
    )
    batch_recipe_id = Column(
        Integer, ForeignKey("batch_recipes.batch_recipe_id"), primary_key=True
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    quantity_used = Column(DECIMAL(10, 2))
    unit = Column(String(20))

    menu_item = relationship("MenuItem", back_populates="menu_item_batch_usage")
    batch_recipe = relationship("BatchRecipe", back_populates="menu_item_batch_usage")
    restaurant = relationship("Restaurant", back_populates="menu_item_batch_usage")
