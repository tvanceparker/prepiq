# app/schemas/daily_forecast_accuracy_dto.py

from pydantic import BaseModel
from typing import Optional


class DailyForecastAccuracyBase(BaseModel):
    breakdown_id: int
    menu_item_id: int
    forecast_date: str  # can be passed in ISO format
    predicted_quantity: int
    actual_quantity: int
    forecast_error: int
    error_percentage: float
    restaurant_id: int


class DailyForecastAccuracyCreate(DailyForecastAccuracyBase):
    created_at: str


class DailyForecastAccuracyUpdate(BaseModel):
    predicted_quantity: Optional[int] = None
    actual_quantity: Optional[int] = None
    forecast_error: Optional[int] = None
    error_percentage: Optional[float] = None


class DailyForecastAccuracy(DailyForecastAccuracyBase):
    accuracy_id: int

    class Config:
        orm_mode = True
