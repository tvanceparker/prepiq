# app/schemas/scheduled_shifts_dto.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ScheduledShiftBase(BaseModel):
    restaurant_id: int
    employee_id: Optional[int] = None
    shift_start: datetime  # Change from str to datetime
    shift_end: datetime  # Change from str to datetime
    shift_type: Optional[str] = None


class ScheduledShiftCreate(ScheduledShiftBase):
    pass


class ScheduledShiftUpdate(ScheduledShiftBase):
    pass


class ScheduledShift(ScheduledShiftBase):
    shift_id: int

    class Config:
        orm_mode = True
