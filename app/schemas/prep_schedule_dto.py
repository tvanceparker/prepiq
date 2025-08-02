from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class PrepScheduleBase(BaseModel):
    restaurant_id: Optional[int] = None  # Usually set in service, not update payload
    batch_recipe_id: Optional[int] = None
    prep_date: Optional[date] = None
    quantity_needed: Optional[Decimal] = None
    quantity_prepped: Optional[Decimal] = None
    prep_batch_count: Optional[Decimal] = None  # Changed to Decimal
    prep_time_minutes_estimated: Optional[int] = None
    prep_time_minutes_actual: Optional[int] = None
    assigned_employee_id: Optional[int] = None
    status: Optional[str] = None  # 'scheduled', 'in_progress', 'completed'


class PrepScheduleCreate(PrepScheduleBase):
    restaurant_id: int
    batch_recipe_id: int
    prep_date: date


class PrepScheduleUpdate(BaseModel):
    status: Optional[str] = None
    prep_time_minutes_actual: Optional[int] = None
    prep_batch_count: Optional[Decimal] = None


class PrepSchedule(PrepScheduleBase):
    prep_id: int
    created_at: datetime

    class Config:
        orm_mode = True
        allow_population_by_field_name = True
