from fastapi import APIRouter, Depends, Body, Query, HTTPException
from typing import Optional, List
from datetime import date
from app.services.pos_service import InternalPOSService
from app.services.helpers.cash_drawer_service import CashDrawerService
from app.services.helpers.stripe_terminal_service import StripeTerminalService
from app.services.order_service import OrderService
from app.api.dependencies import (
    get_waiter_service,
    build_service,
    get_cash_drawer_service,
    get_stripe_terminal_service,
)
from app.schemas.pos_dto import (
    PaymentRequest,
    PaymentConfirmRequest,
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    DeviceSettingsResponse,
    DeviceSettingsUpdateResponse,
    DeviceTokenRequest,
    DeviceTokenResponse,
    POSDeviceResponse,
    POSModeUpdateRequest,
    POSModeResponse,
    SendOrderResponse,
    ConfirmPaymentResponse,
    # Cash Drawer DTOs
    CashDrawerOpenRequest,
    CashDrawerCloseRequest,
    CashDrawerPayInOutRequest,
    CashDrawerNoSaleRequest,
    CashDrawerSaleRequest,
    CashDrawerSessionResponse,
    CashDrawerTransactionResponse,
    CashDrawerSessionDetailResponse,
    CashDrawerTotalsResponse,
    # Terminal DTOs
    TerminalLocationCreateRequest,
    TerminalLocationResponse,
    TerminalReaderRegisterRequest,
    TerminalReaderResponse,
    TerminalReaderListResponse,
    TerminalPaymentRequest,
    TerminalPaymentResponse,
    TerminalProcessPaymentRequest,
    TerminalProcessPaymentResponse,
    TerminalSimulatePaymentRequest,
    TerminalRefundRequest,
    TerminalRefundResponse,
    CompleteOrderPaymentRequest,
)
from app.schemas.order_dto import OrderCreate, OrderUpdate, OrderResponse, OrderDTO
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/pos", tags=["Internal POS"])


# =============================================================================
# Device Routes
# =============================================================================

@router.get("/devices", response_model=List[POSDeviceResponse])
@log_route("List POS Devices")
async def list_devices(
    pos_service: InternalPOSService = Depends(get_waiter_service),
):
    return await pos_service.list_devices()


@router.post("/devices/register", response_model=DeviceRegistrationResponse)
@log_route("Register Device")
async def register_device(
    registration: DeviceRegistrationRequest,
    pos_service: InternalPOSService = Depends(get_waiter_service)
):
    # Basic device_type validation
    if registration.device_type not in ("pos_terminal", "kitchen_display", "mobile"):
        raise ValueError(f"Invalid device_type: {registration.device_type}")

    return await pos_service.register_device(registration)

@router.get("/devices/{device_id}/settings", response_model=DeviceSettingsResponse)
@log_route("Get Device Settings")
async def get_device_settings(
    device_id: int,
    pos_service: InternalPOSService = Depends(get_waiter_service)
):
    return await pos_service.get_device_settings(device_id)

@router.put("/devices/{device_id}/settings", response_model=DeviceSettingsUpdateResponse)
@log_route("Update Device Settings")
async def update_device_settings(
    device_id: int,
    settings: dict = Body(...),
    pos_service: InternalPOSService = Depends(get_waiter_service)
):
    return await pos_service.update_device_settings(device_id, settings)

@router.post("/orders/send", response_model=SendOrderResponse)
@log_route("Send Order to Kitchen")
async def send_order_to_kitchen(
    order: dict = Body(...),
    pos_service: InternalPOSService = Depends(get_waiter_service)
):
    return await pos_service.send_order_to_kitchen(order)


@router.post("/orders", response_model=OrderResponse)
@log_route("Create Order")
async def create_order(
    order: OrderCreate,
    order_service: OrderService = Depends(build_service(OrderService)),
):
    order_id = await order_service.create_order(order)
    return OrderResponse(order_id=order_id, status="created", message="Order created")


@router.get("/orders/{order_id}", response_model=OrderDTO)
@log_route("Get Order")
async def get_order(
    order_id: int,
    order_service: OrderService = Depends(build_service(OrderService)),
):
    order = await order_service.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.put("/orders/{order_id}", response_model=OrderResponse)
@log_route("Update Order")
async def update_order(
    order_id: int,
    order_update: OrderUpdate,
    order_service: OrderService = Depends(build_service(OrderService)),
):
    result = await order_service.update_order(order_id, order_update)
    return OrderResponse(order_id=order_id, status=result.get("status", "updated"), message=result.get("message"))


@router.post("/orders/{order_id}/complete")
@log_route("Complete Order With Payment")
async def complete_order_with_payment(
    order_id: int,
    payload: CompleteOrderPaymentRequest,
    order_service: OrderService = Depends(build_service(OrderService)),
):
    return await order_service.complete_order_with_payment(order_id, payload)

@router.post("/payments/create-intent")
@log_route("Create Payment Intent")
async def create_payment_intent(
    payment_req: PaymentRequest,
    pos_service: InternalPOSService = Depends(get_waiter_service)
):
    return await pos_service.create_payment_intent(payment_req)

@router.post("/payments/confirm", response_model=ConfirmPaymentResponse)
@log_route("Confirm Payment")
async def confirm_payment(
    confirm_req: PaymentConfirmRequest,
    pos_service: InternalPOSService = Depends(get_waiter_service)
):
    return await pos_service.confirm_payment(confirm_req.payment_intent_id)


# =============================================================================
# Cash Drawer Routes
# =============================================================================

@router.post("/cash-drawer/open", response_model=CashDrawerSessionResponse)
@log_route("Open Cash Drawer")
async def open_cash_drawer(
    request: CashDrawerOpenRequest,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Open a new cash drawer session with specified opening float."""
    session = await drawer_service.open_drawer(
        opening_float=request.opening_float,
        device_id=request.device_id,
        notes=request.notes
    )
    return session


@router.post("/cash-drawer/close", response_model=CashDrawerSessionResponse)
@log_route("Close Cash Drawer")
async def close_cash_drawer(
    request: CashDrawerCloseRequest,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Close a cash drawer session with final cash count."""
    session = await drawer_service.close_drawer(
        session_id=request.session_id,
        actual_cash=request.actual_cash,
        closing_float=request.closing_float,
        notes=request.notes
    )
    return session


@router.get("/cash-drawer/current", response_model=Optional[CashDrawerSessionResponse])
@log_route("Get Current Drawer Session")
async def get_current_drawer_session(
    device_id: Optional[int] = Query(None),
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Get the currently open drawer session."""
    return await drawer_service.get_current_session(device_id)


@router.get("/cash-drawer/{session_id}", response_model=CashDrawerSessionDetailResponse)
@log_route("Get Drawer Session Details")
async def get_drawer_session_details(
    session_id: int,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Get detailed session info with transaction totals."""
    return await drawer_service.get_session_details(session_id)


@router.get("/cash-drawer/{session_id}/expected", response_model=CashDrawerTotalsResponse)
@log_route("Calculate Expected Cash")
async def calculate_expected_cash(
    session_id: int,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Calculate expected cash without closing the drawer."""
    return await drawer_service.calculate_expected_cash(session_id)


@router.post("/cash-drawer/pay-in", response_model=CashDrawerTransactionResponse)
@log_route("Cash Drawer Pay-In")
async def cash_drawer_pay_in(
    request: CashDrawerPayInOutRequest,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Add cash to the drawer (e.g., from safe)."""
    return await drawer_service.pay_in(
        session_id=request.session_id,
        amount=request.amount,
        reason=request.reason
    )


@router.post("/cash-drawer/pay-out", response_model=CashDrawerTransactionResponse)
@log_route("Cash Drawer Pay-Out")
async def cash_drawer_pay_out(
    request: CashDrawerPayInOutRequest,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Remove cash from the drawer (e.g., safe drop)."""
    return await drawer_service.pay_out(
        session_id=request.session_id,
        amount=request.amount,
        reason=request.reason
    )


@router.post("/cash-drawer/no-sale", response_model=CashDrawerTransactionResponse)
@log_route("Cash Drawer No-Sale")
async def cash_drawer_no_sale(
    request: CashDrawerNoSaleRequest,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Open drawer without a sale (e.g., making change)."""
    return await drawer_service.no_sale(
        session_id=request.session_id,
        reason=request.reason
    )


@router.get("/cash-drawer/sessions/date/{target_date}")
@log_route("List Drawer Sessions for Date")
async def list_drawer_sessions_for_date(
    target_date: date,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Get all drawer sessions for a specific date."""
    sessions = await drawer_service.list_sessions_for_date(target_date)
    return {"sessions": sessions, "count": len(sessions)}


@router.get("/cash-drawer/sessions/discrepancies")
@log_route("List Drawer Discrepancies")
async def list_drawer_discrepancies(
    threshold: float = Query(1.0, ge=0),
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service)
):
    """Get closed sessions with cash variance above threshold."""
    sessions = await drawer_service.get_sessions_with_discrepancies(threshold)
    return {"sessions": sessions, "count": len(sessions)}


# =============================================================================
# Stripe Terminal Routes
# =============================================================================

@router.post("/terminal/location", response_model=TerminalLocationResponse)
@log_route("Create Terminal Location")
async def create_terminal_location(
    request: TerminalLocationCreateRequest,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Create a Stripe Terminal location for this restaurant."""
    return await terminal_service.create_location(
        display_name=request.display_name,
        address={
            "line1": request.address_line1,
            "city": request.city,
            "state": request.state,
            "postal_code": request.postal_code,
            "country": request.country
        }
    )


@router.get("/terminal/location", response_model=Optional[TerminalLocationResponse])
@log_route("Get Terminal Location")
async def get_terminal_location(
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Get the restaurant's Terminal location."""
    return await terminal_service.get_location()


@router.post("/terminal/readers/register", response_model=TerminalReaderResponse)
@log_route("Register Terminal Reader")
async def register_terminal_reader(
    request: TerminalReaderRegisterRequest,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Register a new card reader with the pairing code."""
    return await terminal_service.register_reader(
        registration_code=request.registration_code,
        label=request.label,
        device_type=request.device_type
    )


@router.get("/terminal/readers", response_model=TerminalReaderListResponse)
@log_route("List Terminal Readers")
async def list_terminal_readers(
    status: Optional[str] = Query(None, description="Filter by status: online, offline"),
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """List all registered card readers."""
    readers = await terminal_service.list_readers(status_filter=status)
    return {"readers": readers, "total": len(readers)}


@router.get("/terminal/readers/{reader_id}", response_model=TerminalReaderResponse)
@log_route("Get Terminal Reader")
async def get_terminal_reader(
    reader_id: int,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Get a specific reader by ID."""
    reader = await terminal_service.get_reader(reader_id)
    if not reader:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reader not found")
    return reader


@router.post("/terminal/readers/{reader_id}/sync", response_model=TerminalReaderResponse)
@log_route("Sync Terminal Reader Status")
async def sync_terminal_reader_status(
    reader_id: int,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Sync reader status from Stripe."""
    return await terminal_service.sync_reader_status(reader_id)


@router.delete("/terminal/readers/{reader_id}")
@log_route("Delete Terminal Reader")
async def delete_terminal_reader(
    reader_id: int,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Remove a reader from the system."""
    await terminal_service.delete_reader(reader_id)
    return {"status": "deleted", "reader_id": reader_id}


@router.post("/terminal/payments/create", response_model=TerminalPaymentResponse)
@log_route("Create Terminal Payment")
async def create_terminal_payment(
    request: TerminalPaymentRequest,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Create a PaymentIntent for card-present payment."""
    return await terminal_service.create_terminal_payment_intent(
        amount=request.amount,
        order_id=request.order_id,
        currency=request.currency,
        tip_eligible=request.tip_eligible,
        capture_method=request.capture_method
    )


@router.post("/terminal/payments/process", response_model=TerminalProcessPaymentResponse)
@log_route("Process Terminal Payment")
async def process_terminal_payment(
    request: TerminalProcessPaymentRequest,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Send payment to reader for card collection."""
    return await terminal_service.process_payment_on_reader(
        reader_id=request.reader_id,
        payment_intent_id=request.payment_intent_id
    )


@router.post("/terminal/readers/{reader_id}/cancel")
@log_route("Cancel Terminal Reader Action")
async def cancel_terminal_reader_action(
    reader_id: int,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Cancel any pending action on a reader."""
    return await terminal_service.cancel_reader_action(reader_id)


@router.post("/terminal/payments/capture")
@log_route("Capture Terminal Payment")
async def capture_terminal_payment(
    payment_intent_id: str = Body(..., embed=True),
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Capture an authorized payment."""
    return await terminal_service.capture_payment(payment_intent_id)


@router.post("/terminal/payments/refund", response_model=TerminalRefundResponse)
@log_route("Refund Terminal Payment")
async def refund_terminal_payment(
    request: TerminalRefundRequest,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Refund a terminal payment (full or partial)."""
    return await terminal_service.refund_payment(
        payment_intent_id=request.payment_intent_id,
        amount=request.amount,
        reason=request.reason
    )


@router.post("/terminal/payments/simulate")
@log_route("Simulate Terminal Payment")
async def simulate_terminal_payment(
    request: TerminalSimulatePaymentRequest,
    terminal_service: StripeTerminalService = Depends(get_stripe_terminal_service)
):
    """Simulate a card payment (test mode only)."""
    return await terminal_service.simulate_reader_payment(
        reader_id=request.reader_id,
        card_number=request.card_number
    )
@router.post("/refresh-token", response_model=DeviceTokenResponse)
@log_route("Refresh Device Token")
async def refresh_device_token(
    token_request: DeviceTokenRequest,
    pos_service: InternalPOSService = Depends(get_waiter_service),
):
    return await pos_service.refresh_device_token(token_request)


@router.post("/cash-drawer/sale", response_model=CashDrawerTransactionResponse)
@log_route("Record Drawer Sale")
async def record_cash_drawer_sale(
    request: CashDrawerSaleRequest,
    drawer_service: CashDrawerService = Depends(get_cash_drawer_service),
):
    payment_method = request.payment_method.value if hasattr(request.payment_method, "value") else request.payment_method
    if payment_method == "card_present":
        payment_method = "card"
    return await drawer_service.record_sale(
        session_id=request.session_id,
        amount=request.amount,
        payment_method=payment_method,
        order_id=request.order_id,
        payment_id=request.payment_id,
        tip_amount=request.tip_amount,
        cash_tendered=request.cash_tendered,
        notes=request.notes,
    )


# =============================================================================
# POS Settings Routes
# =============================================================================


@router.get("/settings/mode", response_model=POSModeResponse)
@log_route("Get POS Mode Settings")
async def get_pos_mode_settings(
    pos_service: InternalPOSService = Depends(get_waiter_service),
):
    return await pos_service.get_pos_mode_settings()


@router.put("/settings/mode", response_model=POSModeResponse)
@log_route("Update POS Mode Settings")
async def update_pos_mode_settings(
    payload: POSModeUpdateRequest,
    pos_service: InternalPOSService = Depends(get_waiter_service),
):
    return await pos_service.update_pos_mode_settings(payload)
