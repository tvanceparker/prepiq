from pydantic import BaseModel, Field
from typing import List, Optional, Any


class ModifierCreate(BaseModel):
    mod_type: str
    reference_id: Optional[int] = None
    quantity: Optional[float] = 1
    note: Optional[str] = None


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1
    unit_price: float
    instructions: Optional[str] = None
    # avoid mutable default; allow missing modifiers
    modifiers: Optional[List[ModifierCreate]] = None


class OrderCreate(BaseModel):
    # make external_id truly optional with a default
    external_id: Optional[str] = None
    # include restaurant_id so clients can send it (optional; service still scopes by authenticated restaurant)
    restaurant_id: Optional[int] = None
    sales_channel: Optional[str] = "in_person"
    items: List[OrderItemCreate]
    subtotal: float
    tax: float = 0.0
    discount: float = 0.0
    total: float


class OrderUpdate(BaseModel):
    external_id: Optional[str] = None
    sales_channel: Optional[str] = None
    status: Optional[str] = None
    items: Optional[List[OrderItemCreate]] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    total: Optional[float] = None


class OrderResponse(BaseModel):
    order_id: int
    status: str
    message: Optional[str]


# Request model for status updates
class StatusUpdate(BaseModel):
    status: str


# Rich DTOs used for reading orders back to clients
class OrderItemDTO(BaseModel):
    order_item_id: int
    order_id: int
    menu_item_id: int
    quantity: float
    unit_price: float
    instructions: Optional[str] = None
    # keep simple modifiers shape for now
    modifiers: Optional[List[ModifierCreate]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class OrderDTO(BaseModel):
    order_id: int
    external_id: Optional[str] = None
    sales_channel: Optional[str] = None
    # canonical status field for frontend
    status: str
    # legacy alias field supported by some clients
    order_status: Optional[str] = None
    items: List[OrderItemDTO] = []
    subtotal: float
    tax: float
    discount: float
    total: float
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
    inventory_deduction_state: Optional[str] = None
