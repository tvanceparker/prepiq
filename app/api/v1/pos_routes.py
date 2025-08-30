from fastapi import APIRouter, Depends, Body
from app.services.pos_service import POSService
from app.api.dependencies import get_waiter_service
from app.schemas.pos_dto import PaymentRequest, PaymentConfirmRequest, DeviceRegistrationRequest, DeviceSettingsResponse, DeviceSettingsUpdateResponse
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/pos", tags=["POS"])

@router.post("/devices/register", response_model=DeviceSettingsResponse)
@log_route("Register Device")
async def register_device(
    registration: DeviceRegistrationRequest,
    pos_service: POSService = Depends(get_waiter_service)
):
    return await pos_service.register_device(registration)

@router.get("/devices/{device_id}/settings", response_model=DeviceSettingsResponse)
@log_route("Get Device Settings")
async def get_device_settings(
    device_id: int,
    pos_service: POSService = Depends(get_waiter_service)
):
    return await pos_service.get_device_settings(device_id)

@router.put("/devices/{device_id}/settings", response_model=DeviceSettingsUpdateResponse)
@log_route("Update Device Settings")
async def update_device_settings(
    device_id: int,
    settings: dict = Body(...),
    pos_service: POSService = Depends(get_waiter_service)
):
    return await pos_service.update_device_settings(device_id, settings)

@router.post("/orders/send")
@log_route("Send Order to Kitchen")
async def send_order_to_kitchen(
    order: dict = Body(...),
    pos_service: POSService = Depends(get_waiter_service)
):
    return await pos_service.send_order_to_kitchen(order)

@router.post("/payments/create-intent")
@log_route("Create Payment Intent")
async def create_payment_intent(
    payment_req: PaymentRequest,
    pos_service: POSService = Depends(get_waiter_service)
):
    return await pos_service.create_payment_intent(payment_req)

@router.post("/payments/confirm")
@log_route("Confirm Payment")
async def confirm_payment(
    confirm_req: PaymentConfirmRequest,
    pos_service: POSService = Depends(get_waiter_service)
):
    return await pos_service.confirm_payment(confirm_req.payment_intent_id)
