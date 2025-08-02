# app/schemas/error_logs_dto.py

from pydantic import BaseModel
from typing import Optional


class ErrorLogBase(BaseModel):
    restaurant_id: int
    employee_id: Optional[int] = None
    message: str  # Corrected to match model field
    level: Optional[str] = None  # Corrected to match model field
    trace: Optional[str] = None
    source: Optional[str] = None
    created_at: Optional[str] = None  # Optional, will use default if not provided


class ErrorLogCreate(ErrorLogBase):
    pass


class ErrorLogUpdate(ErrorLogBase):
    pass


class ErrorLog(ErrorLogBase):
    log_id: int

    class Config:
        orm_mode = True
