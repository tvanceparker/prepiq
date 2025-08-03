# db/models/menu_items_orm.py

from sqlalchemy import Column, Integer, String, DECIMAL, Boolean, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class MenuItem(Base):
    __tablename__ = "menu_items"

    menu_item_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    name = Column(String(100), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    category = Column(String(50))
    is_active = Column(Boolean, default=True)

    restaurant = relationship("Restaurant", back_populates="menu_items")
    menu_item_recipes = relationship("MenuItemRecipe", back_populates="menu_item")
    sales = relationship("Sales", back_populates="menu_item")
    forecast_accuracy = relationship("ForecastAccuracy", back_populates="menu_item")
    forecasts = relationship("Forecast", back_populates="menu_item")
    forecast_breakdowns = relationship("ForecastBreakdown", back_populates="menu_item")
    menu_item_batch_usage = relationship(
        "MenuItemBatchUsage", back_populates="menu_item"
    )
    daily_forecast_accuracy = relationship(
        "DailyForecastAccuracy", back_populates="menu_item"
    )
    batch_recipe_forecast_breakdowns = relationship(
        "BatchRecipeForecastBreakdown", back_populates="source_menu_item"
    )
