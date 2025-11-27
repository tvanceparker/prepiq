from pydantic import BaseModel
from typing import Optional, List


class PaymentRequest(BaseModel):
    order_id: int
    amount: int  # in cents
    currency: str = "usd"
    payment_method_types: list[str] = ["card"]


class PaymentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    status: str


class PaymentConfirmRequest(BaseModel):
    payment_intent_id: str


class DeviceRegistrationRequest(BaseModel):
    device_name: str
    device_type: str  # 'pos_terminal', 'kitchen_display', 'mobile', etc.
    device_fingerprint: Optional[str] = None


class DeviceSettingsResponse(BaseModel):
    device_id: int
    device_type: str
    merged_settings: dict
    restaurant_capabilities: dict


class DeviceSettingsUpdateResponse(BaseModel):
    status: str
    device_settings: dict


class SalesChannelsResponse(BaseModel):
    sales_channels: List[str]


class SendOrderResponse(BaseModel):
    status: str


class ConfirmPaymentResponse(BaseModel):
    status: str
    payment_intent_id: str


# POS Item Mapping DTOs
class POSItemMappingResponse(BaseModel):
    mapping_id: int
    restaurant_id: int
    pos_provider: str
    external_item_id: str
    external_item_name: Optional[str]
    menu_item_id: Optional[int]
    confidence_score: float
    mapping_status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class POSItemMappingCreate(BaseModel):
    external_item_id: str
    pos_provider: str
    external_item_name: Optional[str] = None
    menu_item_id: Optional[int] = None
    confidence_score: float = 0.00
    mapping_status: str = "unmapped"


class POSItemMappingUpdate(BaseModel):
    menu_item_id: Optional[int] = None
    mapping_status: Optional[str] = None
    confidence_score: Optional[float] = None


class POSItemMappingsListResponse(BaseModel):
    mappings: List[POSItemMappingResponse]
    total: int
    unmapped_count: int
    auto_mapped_count: int
    manual_mapped_count: int


class BatchAutoMatchRequest(BaseModel):
    items: List[dict]  # [{external_item_id, external_item_name}, ...]
    pos_provider: str


class BatchAutoMatchResponse(BaseModel):
    matched: int
    unmapped: int
    total: int
