# app/schemas/forecasts_dto.py

from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class ForecastBase(BaseModel):
    restaurant_id: int
    menu_item_id: int
    forecast_period_start: date  # Use date instead of str for better type handling
    forecast_period_end: date  # Use date instead of str for better type handling
    confidence_score: Optional[float] = None  # Optional, as per schema
    adjusted_quantity: Optional[float] = None  # Optional, as per schema
    used_in_order_generation: Optional[bool] = False  # Optional, with default
    forecast_version: Optional[int] = 1  # Default to 1


class ForecastCreate(ForecastBase):
    pass


class ForecastUpdate(ForecastBase):
    pass


class DailyBreakdown(BaseModel):
    date: date
    quantity: int


class ForecastTrendResponse(BaseModel):
    menu_item_id: int
    menu_item_name: str
    forecast_id: int
    forecast_period_start: date
    forecast_period_end: date
    predicted_total_quantity: float
    confidence_score: float
    daily_breakdown: List[DailyBreakdown]


class Forecast(ForecastBase):
    forecast_id: int

    class Config:
        orm_mode = True
