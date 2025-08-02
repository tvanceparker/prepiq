# app/schemas/activity_logs_dto.py
from pydantic import BaseModel
from typing import Optional


class ActivityLogBase(BaseModel):
    restaurant_id: int
    employee_id: int
    action: str
    details: Optional[str] = None
    created_at: Optional[str] = None


class ActivityLogCreate(ActivityLogBase):
    pass


class ActivityLogUpdate(ActivityLogBase):
    pass


class ActivityLog(ActivityLogBase):
    activity_id: int

    class Config:
        orm_mode = True
