# db/models/forecast_accuracy_orm.py

from sqlalchemy import Column, Integer, Date, Float, DateTime, ForeignKey
from app.db.session import Base
from sqlalchemy.orm import relationship
from datetime import datetime  # <- Ensure datetime is imported


class ForecastAccuracy(Base):
    __tablename__ = "forecast_accuracy"

    accuracy_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(
        Integer, ForeignKey("restaurants.restaurant_id"), nullable=False
    )
    menu_item_id = Column(
        Integer, ForeignKey("menu_items.menu_item_id"), nullable=False
    )
    forecast_id = Column(Integer, ForeignKey("forecasts.forecast_id"), nullable=False)
    forecast_version = Column(Integer, nullable=False)
    forecast_period_start = Column(Date, nullable=False)
    forecast_period_end = Column(Date, nullable=False)
    predicted_quantity = Column(Float)
    actual_quantity = Column(Integer)
    forecast_error = Column(Float)
    error_percentage = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", back_populates="forecast_accuracy")
    menu_item = relationship("MenuItem", back_populates="forecast_accuracy")
    forecast = relationship(
        "Forecast", back_populates="forecast_accuracy"
    )  # Corrected back_populates
