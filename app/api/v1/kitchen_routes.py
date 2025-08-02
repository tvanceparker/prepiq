from fastapi import APIRouter, Depends, Path
from app.services.kitchen_service import KitchenService
from app.api.dependencies import get_kitchen_service

router = APIRouter(prefix="/kitchen", tags=["Kitchen"])

@router.post("/orders/{order_id}/done")
async def mark_order_done(
    order_id: int = Path(...),
    kitchen_service: KitchenService = Depends(get_kitchen_service)
):
    return await kitchen_service.mark_order_done(order_id)
