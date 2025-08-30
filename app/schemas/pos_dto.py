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
