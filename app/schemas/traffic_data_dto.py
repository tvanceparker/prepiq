# app/schemas/traffic_data_dto.py
from pydantic import BaseModel
from typing import Optional


class TrafficDataBase(BaseModel):
    restaurant_id: int
    traffic_date: str
    traffic_condition: Optional[str] = None
    traffic_delay_minutes: Optional[int] = None


class TrafficDataCreate(TrafficDataBase):
    pass


class TrafficDataUpdate(TrafficDataBase):
    pass


class TrafficData(TrafficDataBase):
    traffic_id: int

    class Config:
        orm_mode = True
