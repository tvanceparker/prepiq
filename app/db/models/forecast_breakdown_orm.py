# app/db/models/forecast_breakdown_orm.py

from sqlalchemy import Column, Integer, Date, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship


class ForecastBreakdown(Base):
    __tablename__ = "forecast_breakdown"

    breakdown_id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.forecast_id"), nullable=False)
    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), nullable=False
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    forecast_date = Column(Date, nullable=False)
    forecasted_quantity = Column(Integer, nullable=False)

    forecast = relationship("Forecast", back_populates="forecast_breakdowns")
    menu_item = relationship("MenuItem", back_populates="forecast_breakdowns")
    restaurant = relationship("Restaurant", back_populates="forecast_breakdown")
    daily_forecast_accuracy = relationship(
        "DailyForecastAccuracy", back_populates="forecast_breakdown"
    )
