from fastapi import APIRouter, Depends
from app.api.dependencies import get_pos_service
from app.schemas.order_dto import OrderCreate, OrderResponse
from app.schemas.pos_dto import SalesChannelsResponse
from app.services.order_service import OrderService
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/orders", tags=["POS Orders"])


@router.get("/{order_id}")
@log_route("Get Order by ID")
async def get_order(order_id: int, pos_service: OrderService = Depends(get_pos_service)):
    return await pos_service.get_order_by_id(order_id)


@router.get("/")
@log_route("Get Orders")
async def get_orders(status: str = None, pos_service: OrderService = Depends(get_pos_service)):
    if status == "active":
        return await pos_service.get_active_orders()
    else:
        # For now, return active; can expand to all with filter
        return await pos_service.get_active_orders()


@router.get("/sales-channels", response_model=SalesChannelsResponse)
@log_route("Get Sales Channels")
async def get_sales_channels(pos_service: OrderService = Depends(get_pos_service)):
    channels = await pos_service.get_sales_channels()
    return SalesChannelsResponse(sales_channels=channels)


@router.put("/{order_id}/status")
@log_route("Update Order Status")
async def update_order_status(order_id: int, status: str, pos_service: OrderService = Depends(get_pos_service)):
    await pos_service.update_order_status(order_id, status)
    return {"message": f"Order {order_id} status updated to {status}"}


@router.post("/{order_id}/complete")
@log_route("Complete Order")
async def complete_order(order_id: int, pos_service: OrderService = Depends(get_pos_service)):
    await pos_service.complete_order(order_id)
    return {"message": f"Order {order_id} completed"}


@router.post("/{order_id}/cancel")
@log_route("Cancel Order")
async def cancel_order(order_id: int, pos_service: OrderService = Depends(get_pos_service)):
    await pos_service.cancel_order(order_id)
    return {"message": f"Order {order_id} cancelled"}


@router.post("/send", response_model=OrderResponse)
@log_route("Send Order")
async def send_order(order: OrderCreate, pos_service: OrderService = Depends(get_pos_service)):
    order_id = await pos_service.create_order(order)
    return OrderResponse(order_id=order_id, status="open", message="Order sent to kitchen")
