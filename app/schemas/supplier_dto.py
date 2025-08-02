# prepiq3/db/schemas/supplier_dto.py

from pydantic import BaseModel
from typing import Optional


class SupplierBase(BaseModel):
    name: str
    type: Optional[str] = None
    region: Optional[str] = None
    contact_info: Optional[str] = None
    rating: Optional[float] = 5.0
    website: Optional[str] = None
    is_active: Optional[bool] = True
    supplier_feedback: Optional[str] = None
    contract_status: Optional[str] = "Active"
    contract_start_date: Optional[str] = None
    contract_end_date: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class Supplier(SupplierBase):
    supplier_id: int

    class Config:
        orm_mode = True
