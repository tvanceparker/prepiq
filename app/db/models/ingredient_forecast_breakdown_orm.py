# app/db/models/ingredient_forecast_breakdown_orm.py

from sqlalchemy import Column, Integer, ForeignKey, Date, DECIMAL, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class ForecastSourceType(enum.Enum):
    menu_item = "menu_item"
    batch_recipe = "batch_recipe"


class IngredientForecastBreakdown(Base):
    __tablename__ = "ingredient_forecast_breakdown"

    ingredient_breakdown_id = Column(Integer, primary_key=True, autoincrement=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.forecast_id"), nullable=False)
    forecast_date = Column(Date, nullable=False)
    ingredient_id = Column(
        Integer, ForeignKey("ingredients.ingredient_id"), nullable=False
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=True
    )
    quantity = Column(DECIMAL(10, 2), nullable=False)
    source_type = Column(Enum(ForecastSourceType), nullable=False)
    source_id = Column(Integer, nullable=False)  # menu_item_id or batch_recipe_id
    created_at = Column(DateTime, server_default=func.now())

    forecast = relationship("Forecast", back_populates="ingredient_forecast_breakdowns")
    ingredient = relationship(
        "Ingredient", back_populates="ingredient_forecast_breakdowns"
    )
