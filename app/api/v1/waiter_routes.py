from fastapi import APIRouter, Depends, Body
from app.services.waiter_service import WaiterService
from app.api.dependencies import get_waiter_service

router = APIRouter(prefix="/waiter", tags=["Waiter"])

@router.post("/orders/send")
async def send_order_to_kitchen(
    order: dict = Body(...),
    waiter_service: WaiterService = Depends(get_waiter_service)
):
    return await waiter_service.send_order_to_kitchen(order)
