
# app/api/v1/inventory_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.services.inventory_service import InventoryService
from app.api.dependencies import get_inventory_service
from app.schemas.inventory_dto import (
    InventoryByCategoryItem,
    InventoryAdjustmentIn,
    InventoryAdjustmentResultDTO,
    InventoryDTO,
    InventoryDetailsDTO,
    SupplierOut,
    InventoryLotIn,
    InventorySetCurrentStockIn,
)
from app.schemas.inventory_dto import (
    StockMovementItem,
    PurchaseOrderDTO,
    PurchaseOrderCreateDTO,
    PurchaseOrderCreateResultDTO,
    PurchaseOrderStatusUpdateResultDTO,
    PurchaseOrderItemAddResultDTO,
    PurchaseOrderItemUpdateResultDTO,
    PurchaseOrderItemDeleteResultDTO,
    InventoryDeductionDiscrepancyDTO,
    InventoryDiscrepancyHistoryItemDTO,
    PurchaseOrderItemUpdateDTO,
    PurchaseOrderReceiptDTO,
    PurchaseOrderReceiptSummaryDTO,
    POSuggestionsResponseDTO,
    CreatePOsFromSuggestionsRequestDTO,
    LastEodDateDTO,
)
from typing import Dict, List, Union

router = APIRouter(prefix="/inventory", tags=["Inventory"])
# --- Purchase Orders ---
@router.post("/purchase_orders", response_model=PurchaseOrderCreateResultDTO)
async def create_purchase_order(
    po: PurchaseOrderCreateDTO,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Create a new purchase order with items.
    """
    return await inventory_service.create_purchase_order(
        supplier_id=po.supplier_id,
        expected_delivery_date=po.expected_delivery_date,
        items=[item.dict() for item in po.items],
        notes=po.notes,
    )

@router.get("/purchase_orders", response_model=List[PurchaseOrderDTO])
async def list_purchase_orders(
    status: str = Query(None),
    supplier_id: int = Query(None),
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    List purchase orders, optionally filter by status or supplier.
    """
    return await inventory_service.get_purchase_orders(status=status, supplier_id=supplier_id)

@router.get("/purchase_orders/{order_id}", response_model=PurchaseOrderDTO)
async def get_purchase_order_detail(
    order_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get a single purchase order with items.
    """
    result = await inventory_service.get_purchase_order_detail(order_id)
    if not result:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return result

@router.patch("/purchase_orders/{order_id}/status", response_model=Union[PurchaseOrderStatusUpdateResultDTO, PurchaseOrderReceiptSummaryDTO])
async def update_purchase_order_status(
    order_id: int,
    status: str,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Update the status of a purchase order (cart, pending, delivered, etc).
    """
    try:
        return await inventory_service.update_purchase_order_status(order_id, status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/purchase_orders/{order_id}/receive", response_model=PurchaseOrderReceiptSummaryDTO)
async def receive_purchase_order(
    order_id: int,
    payload: PurchaseOrderReceiptDTO,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Receive a purchase order into inventory by creating lots and updating stock.
    """
    try:
        return await inventory_service.receive_purchase_order(
            order_id=order_id,
            actual_delivery_date=payload.actual_delivery_date,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.post("/purchase_orders/{order_id}/items", response_model=PurchaseOrderItemAddResultDTO)
async def add_item_to_purchase_order(
    order_id: int,
    item: dict,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Add an item to an existing purchase order.
    """
    return await inventory_service.add_item_to_purchase_order(order_id, item)


@router.patch("/purchase_orders/{order_id}/items/{order_item_id}", response_model=PurchaseOrderItemUpdateResultDTO)
async def update_purchase_order_item(
    order_id: int,
    order_item_id: int,
    payload: PurchaseOrderItemUpdateDTO,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Update an existing purchase order item and recalculate order total.
    """
    result = await inventory_service.update_purchase_order_item(
        order_id, order_item_id, payload.model_dump(exclude_none=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Purchase order item not found")
    return result

@router.delete("/purchase_orders/{order_id}/items/{order_item_id}", response_model=PurchaseOrderItemDeleteResultDTO)
async def remove_item_from_purchase_order(
    order_id: int,
    order_item_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Remove an item from a purchase order.
    """
    return await inventory_service.remove_item_from_purchase_order(order_id, order_item_id)

@router.post("/purchase_orders/generate-suggestions", response_model=POSuggestionsResponseDTO)
async def generate_po_suggestions(
    horizon_days: int = Query(7, ge=1, le=90, description="Number of days to forecast"),
    use_cached_forecast: bool = Query(True, description="Use cached forecast from last EOD or run fresh"),
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Generate purchase order suggestions based on forecast data.
    Returns preview grouped by supplier - not persisted until create-from-suggestions is called.
    
    - use_cached_forecast=True: Uses existing forecast from last EOD run (faster)
    - use_cached_forecast=False: Runs fresh forecast pipeline (slower but more accurate)
    """
    try:
        return await inventory_service.generate_purchase_order_suggestions(
            horizon_days=horizon_days,
            use_cached_forecast=use_cached_forecast,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {str(e)}")

@router.post("/purchase_orders/create-from-suggestions", response_model=List[PurchaseOrderCreateResultDTO])
async def create_pos_from_suggestions(
    payload: CreatePOsFromSuggestionsRequestDTO,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Create purchase orders from generated suggestions.
    Groups items by supplier and creates one PO per supplier with status='cart'.
    
    Expected payload:
    {
        "suggestions": [...],  // List of suggestion items or grouped suppliers
        "notes": "Optional notes"
    }
    """
    suggestions = [item.model_dump() for item in payload.suggestions]
    notes = payload.notes
    
    if not suggestions:
        raise HTTPException(status_code=400, detail="No suggestions provided")
    
    try:
        return await inventory_service.create_purchase_orders_from_suggestions(
            suggestions=suggestions,
            notes=notes,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating orders: {str(e)}")

@router.get("/ingredients/{ingredient_id}/suppliers")
async def get_ingredient_suppliers(
    ingredient_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get all suppliers for a specific ingredient with pricing and pack details.
    Useful for order-by-ingredient flow where user selects ingredient first.
    """
    return await inventory_service.get_ingredient_suppliers(ingredient_id)

@router.get("/ingredients/stock-levels")
async def get_ingredients_stock_levels(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get all ingredients with current stock levels and reorder status.
    Returns status: 'critical', 'low', 'warning', or 'ok'.
    """
    return await inventory_service.get_ingredients_with_stock_levels()


@router.get("/deduction-discrepancies", response_model=List[InventoryDeductionDiscrepancyDTO])
async def get_inventory_deduction_discrepancies(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    List open inventory deduction failures for review in the inventory workspace.
    """
    return await inventory_service.get_inventory_deduction_discrepancies()


@router.get("/discrepancy-history", response_model=List[InventoryDiscrepancyHistoryItemDTO])
async def get_inventory_discrepancy_history(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    ingredient_id: int = Query(None, description="Ingredient ID (optional)"),
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    List discrepancy and recovery history for the inventory workspace.
    """
    try:
        from datetime import datetime

        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()

        if start > end:
            raise HTTPException(status_code=400, detail="Start date must be before or equal to end date")

        return await inventory_service.get_inventory_discrepancy_history(
            start_date=start,
            end_date=end,
            ingredient_id=ingredient_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid date format. Use YYYY-MM-DD. Error: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        if "only available for" in str(e).lower():
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching discrepancy history: {str(e)}")

@router.get("/last-eod-date", response_model=LastEodDateDTO)
async def get_last_eod_date(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get the last EOD run date for the restaurant.
    Useful for showing when cached forecast data was last generated.
    """
    from app.repositories.restaurants_repo import RestaurantRepository

    restaurant_repo = RestaurantRepository(inventory_service.db, inventory_service.restaurant_id)
    restaurant = await restaurant_repo.get_by_id(inventory_service.restaurant_id)
    last_eod = await inventory_service._resolve_cached_forecast_run_date(
        getattr(restaurant, 'last_eod_run_date', None)
    )
    return {"last_eod_run_date": str(last_eod) if last_eod else None}

# Ingredient names for autocomplete/search
@router.get("/ingredient_names")
async def get_ingredient_names(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get all ingredient names and IDs for autocomplete/search.
    """
    return await inventory_service.get_ingredient_names()

@router.get("/stock_movements", response_model=List[StockMovementItem])
async def get_stock_movements(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    ingredient_id: int = Query(None, description="Ingredient ID (optional)"),
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get all stock movements (inbound/outbound) for the given date range and ingredient.
    Only available for Pro/Master tiers.
    """
    try:
        from datetime import datetime
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        # Validate date range
        if start > end:
            raise HTTPException(
                status_code=400, 
                detail="Start date must be before or equal to end date"
            )
        
        return await inventory_service.get_stock_movements(start, end, ingredient_id)
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid date format. Use YYYY-MM-DD. Error: {str(e)}"
        )
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        # Handle tier restriction and other service errors
        if "only available for" in str(e).lower():
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching stock movements: {str(e)}")

@router.get("/ingredient-suppliers")
async def view_ingredient_suppliers(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    View all ingredients with their supplier options and packaging details.
    """
    return await inventory_service.view_ingredient_suppliers()



@router.get("/lot-info/{lot_id}")
async def get_lot_info(
    lot_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get detailed info about a lot, including supplier and pricing.
    """
    lot_info = await inventory_service.get_lot_info(lot_id)
    if not lot_info:
        raise HTTPException(status_code=404, detail="Lot not found")
    return lot_info


@router.get("/used-usage-logs/{lot_id}")
async def get_used_usage_logs(
    lot_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get usage logs related to used quantities for a specific lot.
    """
    logs = await inventory_service.get_used_usage_logs(lot_id)
    return logs


@router.get("/wasted-usage-logs/{lot_id}")
async def get_wasted_usage_logs(
    lot_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Get usage logs related to wasted quantities for a specific lot.
    """
    logs = await inventory_service.get_wasted_usage_logs(lot_id)
    return logs

@router.get("/suppliers")
async def get_supplier_info(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    try:
        suppliers = await inventory_service.view_supplier_info()
        return {
            "success": True,
            "data": suppliers,
            "message": "Suppliers retrieved successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# 1. View Inventory (all inventory items with their lot breakdown)
@router.get("/view", response_model=List[InventoryDTO])
async def view_inventory(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    try:
        return await inventory_service.view_inventory()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# 2. View Inventory Details for a specific inventory item
@router.get("/details/{inventory_id}", response_model=InventoryDetailsDTO)
async def view_inventory_details(
    inventory_id: int,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    try:
        return await inventory_service.view_inventory_details(inventory_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/adjustments")
async def get_inventory_adjustments(
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    return await inventory_service.get_inventory_adjustment_log()

@router.post("/create-ingredient-supplier/{supplier_id}")
async def create_ingredient_supplier(
    supplier_id: int,
    payload: dict,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    if not payload.get("ingredient_id"):
        raise HTTPException(status_code=400, detail="Missing ingredient_id")

    result = await inventory_service.create_ingredient_supplier(supplier_id,payload)

    if result["success"]:
        return {"detail": result["message"], "data": result.get("data")}

    raise HTTPException(status_code=400, detail=result["message"])

@router.post("/create-supplier")
async def create_supplier(
    payload: dict,
    inventory_service: InventoryService = Depends(get_inventory_service)
):
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Missing supplier name")

    result = await inventory_service.create_supplier(payload)

    if result["success"]:
        return {"detail": result["message"], "data": result.get("data")}

    raise HTTPException(status_code=400, detail=result["message"])

@router.patch("/update-supplier")
async def update_supplier(
    payload: dict, inventory_service: InventoryService = Depends(get_inventory_service)
):
    supplier_id = payload.get("supplier_id")
    if not supplier_id:
        raise HTTPException(status_code=400, detail="Missing supplier_id")

    result = await inventory_service.update_supplier(
        supplier_id=supplier_id,
        update_data={k: v for k, v in payload.items() if k != "supplier_id"},
    )

    if result["success"]:
        return {"detail": result["message"]}
    raise HTTPException(status_code=400, detail=result["message"])


@router.patch("/update-ingredient-supplier")
async def update_ingredient_supplier(
    payload: dict, inventory_service: InventoryService = Depends(get_inventory_service)
):
    ingredient_supplier_id = payload.get("ingredient_supplier_id")
    if not ingredient_supplier_id:
        raise HTTPException(status_code=400, detail="Missing ingredient_supplier_id")

    result = await inventory_service.update_ingredient_supplier(
        ingredient_supplier_id=ingredient_supplier_id,
        update_data={k: v for k, v in payload.items() if k != "ingredient_supplier_id"},
    )

    if result["success"]:
        return {"detail": result["message"]}
    raise HTTPException(status_code=400, detail=result["message"])


@router.post("/add-lot")
async def add_inventory_lot(
    payload: InventoryLotIn,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Add inventory by creating a new inventory lot.
    """
    try:
        await inventory_service.add_inventory_from_lots(
            ingredient_supplier_id=payload.ingredient_supplier_id,
            total_received=payload.total_received,
            delivery_date=payload.delivery_date,
        )
        return {"detail": "✅ Inventory lot created and inventory updated."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/adjust-inventory", response_model=InventoryAdjustmentResultDTO)
async def adjust_inventory(
    payload: InventoryAdjustmentIn,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Adjust inventory by updating the lot and inventory quantities.
    """
    try:
        response = await inventory_service.handle_inventory_adjustment(
            inventory_id=payload.inventory_id,
            lot_id=payload.lot_id,
            adjustment_quantity=payload.adjustment_quantity,
            usage_type=payload.usage_type,
            reference_id=payload.reference_id,
            notes=payload.notes,
        )
        if response["success"]:
            return response
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=response["message"]
            )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/set-current-stock", response_model=InventoryAdjustmentResultDTO)
async def set_current_stock(
    payload: InventorySetCurrentStockIn,
    inventory_service: InventoryService = Depends(get_inventory_service),
):
    """
    Reconcile inventory to a freshly counted on-hand quantity.
    """
    try:
        response = await inventory_service.set_inventory_current_stock(
            inventory_id=payload.inventory_id,
            counted_quantity=payload.counted_quantity,
            lot_id=payload.lot_id,
            reason=payload.reason,
            notes=payload.notes,
        )
        if response["success"]:
            return response
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=response["message"])
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

