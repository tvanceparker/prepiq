# app/schemas/supplier_preferences_dto.py

from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class SupplierPreferenceBase(BaseModel):
    restaurant_id: int
    weight_cost: Optional[Decimal] = 0.4
    weight_lead_time: Optional[Decimal] = 0.3
    weight_spoilage: Optional[Decimal] = 0.2
    weight_rating: Optional[Decimal] = 0.1


class SupplierPreferenceCreate(SupplierPreferenceBase):
    pass


class SupplierPreferenceUpdate(SupplierPreferenceBase):
    pass


class SupplierPreference(SupplierPreferenceBase):
    class Config:
        orm_mode = True
