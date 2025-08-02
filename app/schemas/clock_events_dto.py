# app/schemas/clock_events_dto.py

from pydantic import BaseModel
from typing import Optional


class ClockEventBase(BaseModel):
    restaurant_id: int
    employee_id: int
    clock_in: str
    clock_out: Optional[str] = None
    shift_note: Optional[str] = None


class ClockEventCreate(ClockEventBase):
    pass


class ClockEventUpdate(ClockEventBase):
    pass


class ClockEvent(ClockEventBase):
    clock_id: int

    class Config:
        orm_mode = True
