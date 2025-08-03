# db/models/forecasts_orm.py

from sqlalchemy import Column, Integer, Date, DateTime, DECIMAL, Boolean, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship
from datetime import datetime


class Forecast(Base):
    __tablename__ = "forecasts"

    forecast_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), nullable=False
    )
    forecast_period_start = Column(Date, nullable=False)
    forecast_period_end = Column(Date, nullable=False)
    confidence_score = Column(DECIMAL(3, 2), nullable=True)
    adjusted_quantity = Column(DECIMAL(10, 2), nullable=True)
    used_in_order_generation = Column(Boolean, default=False)
    forecast_version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="forecasts")
    menu_item = relationship("MenuItem", back_populates="forecasts")
    forecast_accuracy = relationship(
        "ForecastAccuracy", back_populates="forecast"
    )  # Relationship with ForecastAccuracy
    forecast_breakdowns = relationship("ForecastBreakdown", back_populates="forecast")
    batch_recipe_forecast_breakdowns = relationship(
        "BatchRecipeForecastBreakdown", back_populates="forecast"
    )
    ingredient_forecast_breakdowns = relationship(
        "IngredientForecastBreakdown", back_populates="forecast"
    )
