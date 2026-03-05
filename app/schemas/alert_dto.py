# app/schemas/alert_dto.py

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum

class SeverityEnum(str, Enum):
    info = "info"
    warning = "warning"
    urgent = "urgent"

class AlertBase(BaseModel):
    alert_type: str
    message: str
    severity: SeverityEnum
    employee_id: Optional[int] = None
    role: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

class FixAlertRequest(BaseModel):
    quantity_sold: Optional[float] = None
    sales_channel: Optional[str] = None
    target_quantity_on_hand: Optional[float] = None


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    date_resolved: Optional[datetime] = None
    is_acknowledged: Optional[bool] = None


class AlertResponse(AlertBase):
    alert_id: int
    restaurant_id: int
    date_created: datetime
    date_resolved: Optional[datetime]
    status: str
    is_acknowledged: bool
    model_config = ConfigDict(from_attributes=True)
