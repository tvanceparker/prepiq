from fastapi import APIRouter, Depends, Body
from app.services.internal_pos_service import InternalPOSService
from app.services.order_service import OrderService
from app.api.dependencies import get_waiter_service, build_service
from app.schemas.pos_dto import (
    PaymentRequest,
    PaymentConfirmRequest,
    DeviceRegistrationRequest,
    DeviceSettingsResponse,
    DeviceSettingsUpdateResponse,
    SendOrderResponse,
    ConfirmPaymentResponse,
)
from app.schemas.order_dto import OrderCreate, OrderResponse
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/pos", tags=["Internal POS"])

@router.post("/devices/register", response_model=DeviceSettingsResponse)
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
