# app/schemas/purchase_orders_dto.py

from pydantic import BaseModel
from typing import Optional
from datetime import date


class PurchaseOrderBase(BaseModel):
    restaurant_id: int
    supplier_id: int
    order_date: date
    expected_delivery_date: Optional[date] = None
    actual_delivery_date: Optional[date] = None
    status: Optional[str] = "pending"


class PurchaseOrderCreate(PurchaseOrderBase):
    pass


class PurchaseOrderUpdate(PurchaseOrderBase):
    pass


class PurchaseOrder(PurchaseOrderBase):
    order_id: int

    class Config:
        orm_mode = True
