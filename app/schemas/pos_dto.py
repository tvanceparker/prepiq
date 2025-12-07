from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# =============================================================================
# Enums
# =============================================================================

class POSMode(str, Enum):
    """Restaurant POS mode - must pick one."""
    INTERNAL = "internal"  # PrepIQ's own POS
    EXTERNAL = "external"  # Square, Toast, Clover, etc.


class PaymentMethodType(str, Enum):
    """Payment method types for POS."""
    CASH = "cash"
    CARD = "card"
    CARD_PRESENT = "card_present"  # Stripe Terminal


class CashDrawerTransactionType(str, Enum):
    """Types of cash drawer transactions."""
    CASH_SALE = "cash_sale"
    CARD_SALE = "card_sale"
    CASH_REFUND = "cash_refund"
    CARD_REFUND = "card_refund"
    PAY_IN = "pay_in"
    PAY_OUT = "pay_out"
    NO_SALE = "no_sale"


class CashDrawerSessionStatus(str, Enum):
    """Cash drawer session status."""
    OPEN = "open"
    CLOSED = "closed"


class TerminalReaderStatus(str, Enum):
    """Stripe Terminal reader status."""
    ONLINE = "online"
    OFFLINE = "offline"


# =============================================================================
# Base Payment DTOs
# =============================================================================

class PaymentRequest(BaseModel):
    order_id: int
    amount: int  # in cents
    currency: str = "usd"
    payment_method_types: list[str] = ["card"]
    tip_amount: Optional[int] = None  # Tip in cents
    cash_tendered: Optional[int] = None  # For cash payments, in cents


class PaymentResponse(BaseModel):
    client_secret: str
    payment_intent_id: str
    status: str
    change_due: Optional[int] = None  # For cash payments, in cents


class CompleteOrderPaymentRequest(BaseModel):
    """Payload to complete an order with payment handling."""
    amount_cents: Optional[int] = None
    tip_amount_cents: Optional[int] = None
    currency: str = "usd"
    payment_method: PaymentMethodType = PaymentMethodType.CARD
    cash_tendered_cents: Optional[int] = None
    session_id: Optional[int] = None  # Optional cash drawer session
    reader_id: Optional[int] = None  # For card_present / terminal
    payment_intent_id: Optional[str] = None  # Reuse existing intent if present
    tip_eligible: bool = True
    capture_method: str = "automatic"
    print_receipt: bool = True


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


# =============================================================================
# Cash Drawer DTOs
# =============================================================================

class CashDrawerOpenRequest(BaseModel):
    """Request to open a new cash drawer session."""
    opening_float: float = Field(..., ge=0, description="Starting cash amount")
    device_id: Optional[int] = None
    notes: Optional[str] = None


class CashDrawerCloseRequest(BaseModel):
    """Request to close a cash drawer session."""
    session_id: int
    actual_cash: float = Field(..., ge=0, description="Actual cash counted")
    closing_float: float = Field(default=0, ge=0, description="Cash left for next shift")
    notes: Optional[str] = None


class CashDrawerTransactionRequest(BaseModel):
    """Request to record a transaction in the drawer."""
    session_id: int
    amount: float = Field(..., ge=0)
    transaction_type: CashDrawerTransactionType
    payment_method: Optional[str] = None  # "cash" or "card" for sales
    order_id: Optional[int] = None
    payment_id: Optional[int] = None
    tip_amount: float = 0
    cash_tendered: Optional[float] = None  # For cash sales
    notes: Optional[str] = None


class CashDrawerPayInOutRequest(BaseModel):
    """Request for pay-in or pay-out transactions."""
    session_id: int
    amount: float = Field(..., gt=0)
    reason: str = Field(..., min_length=1)


class CashDrawerNoSaleRequest(BaseModel):
    """Request to open drawer without a sale."""
    session_id: int
    reason: Optional[str] = None


class CashDrawerSessionResponse(BaseModel):
    """Response for cash drawer session."""
    session_id: int
    restaurant_id: int
    device_id: Optional[int]
    opened_by_employee_id: int
    closed_by_employee_id: Optional[int]
    opening_float: float
    closing_float: Optional[float]
    expected_cash: Optional[float]
    actual_cash: Optional[float]
    variance: Optional[float]
    cash_sales_total: float
    card_sales_total: float
    tip_total: float
    status: str
    opened_at: datetime
    closed_at: Optional[datetime]
    notes: Optional[str]

    class Config:
        from_attributes = True


class CashDrawerTransactionResponse(BaseModel):
    """Response for cash drawer transaction."""
    transaction_id: int
    session_id: int
    employee_id: int
    transaction_type: str
    amount: float
    tip_amount: float
    order_id: Optional[int]
    payment_id: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CashDrawerTotalsResponse(BaseModel):
    """Response with drawer session totals."""
    opening_float: float
    cash_sales: float
    cash_refunds: float
    card_sales: float
    card_refunds: float
    pay_ins: float
    pay_outs: float
    tips: float
    expected_cash: float
    net_cash: Optional[float] = None


class CashDrawerSessionDetailResponse(BaseModel):
    """Detailed session response with totals."""
    session: CashDrawerSessionResponse
    totals: CashDrawerTotalsResponse
    transaction_count: int


# =============================================================================
# Stripe Terminal DTOs
# =============================================================================

class TerminalLocationCreateRequest(BaseModel):
    """Request to create a Stripe Terminal location."""
    display_name: str
    address_line1: str
    city: str
    state: str
    postal_code: str
    country: str = "US"


class TerminalLocationResponse(BaseModel):
    """Response for Terminal location."""
    location_id: str
    display_name: str
    address: Optional[dict] = None


class TerminalReaderRegisterRequest(BaseModel):
    """Request to register a new Terminal reader."""
    registration_code: str = Field(..., description="Code shown on reader during pairing")
    label: str = Field(..., description="Human-readable name (e.g., 'Counter 1')")
    device_type: str = "stripe_s700"


class TerminalReaderResponse(BaseModel):
    """Response for a Terminal reader."""
    reader_id: int
    restaurant_id: int
    stripe_reader_id: str
    label: str
    device_type: str
    serial_number: Optional[str]
    status: str
    ip_address: Optional[str]
    last_seen_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class TerminalReaderListResponse(BaseModel):
    """Response for list of readers."""
    readers: List[TerminalReaderResponse]
    total: int


class TerminalPaymentRequest(BaseModel):
    """Request to create a terminal payment."""
    amount: int = Field(..., gt=0, description="Amount in cents")
    order_id: int
    currency: str = "usd"
    tip_eligible: bool = True
    capture_method: str = "automatic"  # or "manual" for auth-only


class TerminalPaymentResponse(BaseModel):
    """Response for terminal payment creation."""
    payment_intent_id: str
    client_secret: str
    status: str


class TerminalProcessPaymentRequest(BaseModel):
    """Request to process payment on a reader."""
    reader_id: int
    payment_intent_id: str


class TerminalProcessPaymentResponse(BaseModel):
    """Response for reader payment processing."""
    reader_id: int
    stripe_reader_id: str
    status: str
    action: Optional[str]


class TerminalSimulatePaymentRequest(BaseModel):
    """Request to simulate payment (test mode only)."""
    reader_id: int
    card_number: str = "4242424242424242"  # Default success card


class TerminalRefundRequest(BaseModel):
    """Request to refund a terminal payment."""
    payment_intent_id: str
    amount: Optional[int] = None  # None for full refund
    reason: Optional[str] = None


class TerminalRefundResponse(BaseModel):
    """Response for terminal refund."""
    refund_id: str
    payment_intent_id: str
    amount: Optional[int]
    status: str


# =============================================================================
# POS Mode / Settings DTOs
# =============================================================================

class POSModeUpdateRequest(BaseModel):
    """Request to update restaurant POS mode."""
    pos_mode: POSMode
    pos_provider: Optional[str] = None  # For external mode: square, toast, clover
    cash_drawer_enabled: bool = True


class POSModeResponse(BaseModel):
    """Response for POS mode settings."""
    pos_mode: str
    pos_provider: Optional[str]
    cash_drawer_enabled: bool
    stripe_terminal_location_id: Optional[str]
    has_terminal_readers: bool
    terminal_payments_enabled: Optional[bool] = None
    preferred_terminal_reader_id: Optional[int] = None


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
