# app/schemas/forecast_accuracy_dto.py

from pydantic import BaseModel
from typing import Optional
from datetime import date


class ForecastAccuracyBase(BaseModel):
    restaurant_id: int
    menu_item_id: int
    forecast_id: int
    forecast_version: int
    forecast_period_start: date  # Use date instead of str for better type handling
    forecast_period_end: date  # Use date instead of str for better type handling
    predicted_quantity: Optional[float] = None
    actual_quantity: Optional[int] = None
    forecast_error: Optional[float] = None
    error_percentage: Optional[float] = None


class ForecastAccuracyCreate(ForecastAccuracyBase):
    pass


class ForecastAccuracyUpdate(ForecastAccuracyBase):
    pass


class ForecastAccuracy(ForecastAccuracyBase):
    accuracy_id: int

    class Config:
        orm_mode = True
