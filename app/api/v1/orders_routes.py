
from typing import List
from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import ValidationError
from app.api.dependencies import get_order_service
from app.schemas.order_dto import OrderCreate, OrderResponse, OrderDTO, StatusUpdate
from app.schemas.pos_dto import SalesChannelsResponse
from app.services.order_service import OrderService
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/orders", tags=["POS Orders"])


@router.get("/menu")
@log_route("Get Menu Items (via OrderService)")
async def get_menu_items(order_service: OrderService = Depends(get_order_service)):
    """Return menu items scoped to the current user's restaurant and tier via OrderService."""
    return await order_service.get_menu_items()


@router.get("/{order_id}", response_model=OrderDTO)
@log_route("Get Order by ID")
async def get_order(order_id: int, pos_service: OrderService = Depends(get_order_service)):
    result = await pos_service.get_order_by_id(order_id)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return result


@router.get("/", response_model=List[OrderDTO])
@log_route("Get Orders")
async def get_orders(
    status: str = None,
    include_completed: bool = False,
    pos_service: OrderService = Depends(get_order_service),
):
    # Only active orders by default; include_completed enables history-lite.
    return await pos_service.get_active_orders(include_completed=include_completed)


@router.post("/", response_model=OrderResponse)
@log_route("Create Order")
async def create_order(order: dict = Body(...), order_service: OrderService = Depends(get_order_service)):
    """Create and persist an order using OrderService (used by POS clients).

    Accept raw JSON, validate against OrderCreate, and return helpful validation details on error.
    """
    try:
        validated = OrderCreate.parse_obj(order)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
    return await order_service.create_order(validated)


@router.get("/sales-channels", response_model=SalesChannelsResponse)
@log_route("Get Sales Channels")
async def get_sales_channels(pos_service: OrderService = Depends(get_order_service)):
    channels = await pos_service.get_sales_channels()
    return SalesChannelsResponse(sales_channels=channels)


@router.put("/{order_id}/status", response_model=OrderResponse)
@log_route("Update Order Status")
async def update_order_status(order_id: int, update: StatusUpdate, pos_service: OrderService = Depends(get_order_service)):
    return await pos_service.update_order_status(order_id, update.status)


@router.post("/{order_id}/complete", response_model=OrderResponse)
@log_route("Complete Order")
async def complete_order(order_id: int, pos_service: OrderService = Depends(get_order_service)):
    return await pos_service.complete_order(order_id)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
@log_route("Cancel Order")
async def cancel_order(order_id: int, pos_service: OrderService = Depends(get_order_service)):
    return await pos_service.cancel_order(order_id)


@router.post("/send", response_model=OrderResponse)
@log_route("Send Order")
async def send_order(order: OrderCreate, pos_service: OrderService = Depends(get_order_service)):
    return await pos_service.create_order(order)
