# app/schemas/weather_data_dto.py
from pydantic import BaseModel
from typing import Optional


class WeatherDataBase(BaseModel):
    restaurant_id: int
    weather_date: str
    temperature: Optional[float] = None
    precipitation: Optional[float] = None
    weather_condition: Optional[str] = None


class WeatherDataCreate(WeatherDataBase):
    pass


class WeatherDataUpdate(WeatherDataBase):
    pass


class WeatherData(WeatherDataBase):
    weather_id: int

    class Config:
        orm_mode = True
