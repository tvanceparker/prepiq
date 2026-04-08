# app/api/v1/prep_routes.py

from fastapi import APIRouter, Depends, HTTPException, Query, Path
from app.schemas.prep_dto import (
    BatchRecipeIngredientUpdate,
    BatchRecipeUpdateRequest,
    IngredientInput,
    CreateBatchRecipeRequest,
    PrepScheduleUpdate,
    PrepLogResponse,
    WasteLogResponse,
    CreateWasteLogRequest,
)
from app.services.prep_service import PrepService
from app.api.dependencies import get_prep_service
from typing import Dict, List, Optional
from datetime import date

router = APIRouter(prefix="/prep", tags=["Prep"])


@router.get("/logs", response_model=List[PrepLogResponse])
async def get_prep_logs(
    start_date: Optional[date] = Query(None, description="Filter logs from this date onwards"),
    end_date: Optional[date] = Query(None, description="Filter logs up to this date"),
    status: Optional[str] = Query(None, description="Filter by status (completed, in_progress, etc.)"),
    batch_recipe_id: Optional[int] = Query(None, description="Filter by batch recipe ID"),
    prep_service: PrepService = Depends(get_prep_service),
):
    """Get prep logs (historical prep schedule records) with optional filters."""
    return await prep_service.get_prep_logs(
        start_date=start_date,
        end_date=end_date,
        status=status,
        batch_recipe_id=batch_recipe_id,
    )


@router.get("/waste-logs", response_model=List[WasteLogResponse])
async def get_waste_logs(
    start_date: Optional[date] = Query(None, description="Filter from this date onwards"),
    end_date: Optional[date] = Query(None, description="Filter up to this date"),
    waste_type: Optional[str] = Query(None, description="Filter by waste or spoilage"),
    prep_service: PrepService = Depends(get_prep_service),
):
    """Get waste and spoilage logs with optional filters."""
    return await prep_service.get_waste_logs(
        start_date=start_date,
        end_date=end_date,
        waste_type=waste_type,
    )


@router.post("/waste-logs")
async def create_waste_log(
    data: CreateWasteLogRequest,
    prep_service: PrepService = Depends(get_prep_service),
):
    """Manually log waste or spoilage."""
    try:
        return await prep_service.create_waste_log(
            ingredient_id=data.ingredient_id,
            batch_recipe_id=data.batch_recipe_id,
            quantity_wasted=data.quantity_wasted,
            unit=data.unit,
            waste_type=data.waste_type,
            reason=data.reason,
            notes=data.notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/schedule", response_model=List[Dict])
async def get_prep_schedule(
    prep_date: Optional[date] = Query(None, description="Optional date to filter schedule"),
    prep_service: PrepService = Depends(get_prep_service),
):
    return await prep_service.get_prep_schedule(prep_date=prep_date)

@router.post("/schedule")
async def create_prep_schedule(
    prep_data: Dict,  # accept a dict directly from request body
    prep_service: PrepService = Depends(get_prep_service),
):
    try:
        created = await prep_service.create_prep_schedule(prep_data)
        return created
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/schedule/{prep_id}")
async def delete_prep_schedule(
    prep_id: int = Path(..., description="ID of the prep schedule to delete"),
    prep_service: PrepService = Depends(get_prep_service),
):
    try:
        result = await prep_service.delete_prep_schedule(prep_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to delete prep schedule")

@router.post("/batch_recipes/create")
async def create_batch_recipe(
    data: CreateBatchRecipeRequest,
    prep_service: PrepService = Depends(get_prep_service),
):
    return await prep_service.create_batch_recipe(
        name=data.name,
        description=data.description,
        yield_quantity=data.yield_quantity,
        yield_unit=data.yield_unit,
        estimated_prep_time_minutes=data.estimated_prep_time_minutes,
        shelf_life_days=data.shelf_life_days,
        ingredients=[ing.dict() for ing in data.ingredients],
    )


@router.get("/view_batch_recipes")
async def view_batch_recipes(prep_service: PrepService = Depends(get_prep_service)):
    return await prep_service.view_batch_recipes()


@router.get("/get_ingredients")
async def get_ingredients(prep_service: PrepService = Depends(get_prep_service)):
    return await prep_service.get_ingredients()


@router.patch("/schedule/{prep_id}")
async def update_prep_schedule(
    prep_id: int = Path(..., description="ID of the prep schedule to update"),
    update_data: PrepScheduleUpdate = ...,
    prep_service: PrepService = Depends(get_prep_service),
):
    try:
        # Call service method
        updated = await prep_service.update_prep_schedule(
            prep_id=prep_id,
            status=update_data.status,
            prep_time_minutes_actual=update_data.prep_time_minutes_actual,
            prep_batch_count=update_data.prep_batch_count,
        )

        response = {
            "prep_id": updated["prep_id"],
            "status": updated["status"],
            "prep_time_minutes_actual": updated.get("prep_time_minutes_actual"),
            "prep_batch_count": updated.get("prep_batch_count"),
            "quantity_prepped": updated.get("quantity_prepped"),
            "message": updated.get("message", "Prep schedule updated successfully."),
        }

        # If there's inventory/ingredient deduction info, include it
        if "inventory_update" in updated:
            response["inventory_update"] = updated["inventory_update"]

        return response

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update prep schedule")


@router.patch("/batch_recipes/{batch_recipe_id}")
async def update_batch_recipe(
    batch_recipe_id: int,
    payload: BatchRecipeUpdateRequest,
    prep_service: PrepService = Depends(get_prep_service),
):
    try:
        await prep_service.update_batch_recipe(
            batch_recipe_id=batch_recipe_id,
            name=payload.name,
            description=payload.description,
            yield_quantity=payload.yield_quantity,
            yield_unit=payload.yield_unit,
            estimated_prep_time_minutes=payload.estimated_prep_time_minutes,
            shelf_life_days=payload.shelf_life_days,
            ingredients=(
                [ing.dict() for ing in payload.ingredients]
                if payload.ingredients
                else None
            ),
        )
        return {"detail": f"Batch recipe {batch_recipe_id} updated successfully."}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


@router.delete("/batch_recipes/{batch_recipe_id}")
async def delete_batch_recipe(
    batch_recipe_id: int,
    prep_service: PrepService = Depends(get_prep_service),
):
    try:
        return await prep_service.delete_batch_recipe(batch_recipe_id)
    except ValueError as error:
        detail = str(error)
        status_code = 404 if "not found" in detail.lower() else 400
        raise HTTPException(status_code=status_code, detail=detail)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {error}")

