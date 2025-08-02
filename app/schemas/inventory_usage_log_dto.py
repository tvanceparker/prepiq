# app/schemas/inventory_usage_log_dto.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class UsageTypeEnum(str, Enum):
    sale = "sale"
    waste = "waste"
    spoilage = "spoilage"
    manual_adjustment = "manual_adjustment"
    batch_production = "batch_production"
    batch_output = "batch_output"


class ReferenceTypeEnum(str, Enum):
    sale = "sale"
    batch = "batch"
    user = "user"
    lot = "lot"
    waste_report = "waste_report"
    other = "other"


class InventoryUsageLogBase(BaseModel):
    restaurant_id: int
    inventory_id: int
    lot_id: Optional[int]
    ingredient_id: int
    used_quantity: float
    unit: str
    used_date: Optional[datetime] = None
    usage_type: UsageTypeEnum
    reference_type: Optional[ReferenceTypeEnum]
    reference_id: Optional[int]
    notes: Optional[str] = None


class InventoryUsageLogCreate(InventoryUsageLogBase):
    pass


class InventoryUsageLogUpdate(InventoryUsageLogBase):
    pass


class InventoryUsageLogOut(InventoryUsageLogBase):
    usage_id: int

    class Config:
        orm_mode = True
