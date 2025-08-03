# db/models/daily_forecast_accuracy_orm.py

from sqlalchemy import Column, Integer, Date, Float, ForeignKey, DECIMAL, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base
from sqlalchemy.sql import func


class DailyForecastAccuracy(Base):
    __tablename__ = "daily_forecast_accuracy"

    accuracy_id = Column(Integer, primary_key=True, index=True)
    breakdown_id = Column(
        Integer, ForeignKey("forecast_breakdown.breakdown_id"), nullable=False
    )
    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), nullable=False
    )
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    forecast_date = Column(Date, nullable=False)
    predicted_quantity = Column(Integer, nullable=False)
    actual_quantity = Column(Integer, nullable=False)
    forecast_error = Column(Integer, nullable=False)
    error_percentage = Column(DECIMAL(5, 2), nullable=False)
    created_at = Column(DateTime, nullable=False, server_default=func.now())

    forecast_breakdown = relationship(
        "ForecastBreakdown", back_populates="daily_forecast_accuracy"
    )
    menu_item = relationship("MenuItem", back_populates="daily_forecast_accuracy")
    restaurant = relationship("Restaurant", back_populates="daily_forecast_accuracy")
