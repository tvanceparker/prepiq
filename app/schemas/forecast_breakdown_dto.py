# app/schemas/forecast_breakdown_dto.py

from pydantic import BaseModel
from datetime import date


class ForecastBreakdownBase(BaseModel):
    forecast_id: int
    menu_item_id: int
    restaurant_id: int
    forecast_date: date
    forecasted_quantity: int


class ForecastBreakdownCreate(ForecastBreakdownBase):
    pass


class ForecastBreakdownUpdate(ForecastBreakdownBase):
    pass


class ForecastBreakdown(ForecastBreakdownBase):
    breakdown_id: int

    class Config:
        orm_mode = True
