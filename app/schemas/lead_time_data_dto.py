# app/schemas/lead_time_data_dto.py

from pydantic import BaseModel
from typing import Optional


class LeadTimeDataBase(BaseModel):
    restaurant_id: int
    supplier_id: int
    lead_time_date: str  # Keep this as a string for easier JSON parsing or date formats like 'YYYY-MM-DD'
    lead_time_days: Optional[int] = None
    lead_time_variance: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class LeadTimeDataCreate(LeadTimeDataBase):
    pass


class LeadTimeDataUpdate(LeadTimeDataBase):
    pass


class LeadTimeData(LeadTimeDataBase):
    lead_time_id: int

    class Config:
        orm_mode = True
