# app/api/v1/inventory_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.services.inventory_service import InventoryService
from app.api.dependencies import get_inventory_service
from app.schemas.inventory_dto import (
    InventoryByCategoryItem,
    InventoryAdjustmentIn,
    InventoryDTO,
    InventoryDetailsDTO,
    SupplierOut,
    InventoryLotIn,
)
from typing import Dict, List

router = APIRouter(prefix="/inventory", tags=["Inventory"])


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


@router.post("/adjust-inventory")
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
            return {"detail": response["message"]}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=response["message"]
            )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

