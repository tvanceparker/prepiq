# app/schemas/purchase_order_items_dto.py

from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class PurchaseOrderItemBase(BaseModel):
    restaurant_id: int
    order_id: int
    ingredient_id: int
    quantity_ordered: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemUpdate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItem(PurchaseOrderItemBase):
    order_item_id: int

    class Config:
        orm_mode = True
