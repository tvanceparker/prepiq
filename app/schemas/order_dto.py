from pydantic import BaseModel, Field
from typing import List, Optional, Any


class ModifierCreate(BaseModel):
    mod_type: str
    reference_id: Optional[int]
    quantity: Optional[float] = 1
    note: Optional[str] = None


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1
    unit_price: float
    instructions: Optional[str] = None
    modifiers: Optional[List[ModifierCreate]] = []


class OrderCreate(BaseModel):
    external_id: Optional[str]
    sales_channel: Optional[str] = "in_person"
    items: List[OrderItemCreate]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float


class OrderResponse(BaseModel):
    order_id: int
    status: str
    message: Optional[str]
