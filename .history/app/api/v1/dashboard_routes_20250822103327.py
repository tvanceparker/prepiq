from fastapi import APIRouter, Depends, Query, UploadFile, HTTPException, File, Form
from fastapi.responses import StreamingResponse
from app.schemas.dashboard_dto import (
    MenuItemCreate,
    MenuItemOut,
    MenuItemUpdate,
    EodSalesEntriesIn,
    SalesConflictOut,
)
from app.services.dashboard_service import DashboardService
from app.api.dependencies import get_dashboard_service, check_permissions
from typing import List, Optional
from fastapi import status
from app.utils.logger_helpers import log_route
from datetime import datetime
from datetime import date as _date


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/daily_overview")
@log_route("Get daily overview data")
async def get_daily_overview(
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """Fetch daily sales and forecast overview data."""
    return await dashboard_service.get_daily_overview_data()


@router.get("/list_menu_items", response_model=List[MenuItemOut])
@log_route("List all menu items")
async def list_menu_items(
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """Retrieve all active menu items."""
    return await dashboard_service.list_menu_items()


@router.post("/create_menu_item", response_model=MenuItemOut, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(check_permissions(["edit_menu"]))])
@log_route("Create a new menu item")
async def create_menu_item(
    data: MenuItemCreate,
    dashboard_service: DashboardService = Depends(get_dashboard_service)):
    """Create a new menu item with provided details."""
    return await dashboard_service.create_menu_item(data)


@router.put("/update/{menu_item_id}", response_model=MenuItemOut,
            dependencies=[Depends(check_permissions(["edit_menu"]))])
@log_route("Update existing menu item")
async def update_menu_item(
    menu_item_id: int,
    data: MenuItemUpdate,
    dashboard_service: DashboardService = Depends(get_dashboard_service)):
    """
    Update a menu item by its ID.
    Raises 404 if item not found.
    """
    item = await dashboard_service.update_menu_item(menu_item_id, data.dict(exclude_unset=True))
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.delete("/delete/{menu_item_id}", status_code=status.HTTP_200_OK,
               dependencies=[Depends(check_permissions(["edit_menu"]))])
@log_route("Deactivate a menu item")
async def deactivate_menu_item(
    menu_item_id: int,
    dashboard_service: DashboardService = Depends(get_dashboard_service)
    ):
    """
    Deactivate a menu item by ID.
    Raises 404 if item not found.
    """
    item = await dashboard_service.deactivate_menu_item(menu_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"detail": "Menu item deactivated"}


@router.post("/upload-csv", response_model=List[MenuItemOut],
             dependencies=[Depends(check_permissions(["edit_menu"]))])
@log_route("Upload menu items CSV or XLSX")
async def upload_menu_items_csv(
    file: UploadFile = File(...),
    dashboard_service: DashboardService = Depends(get_dashboard_service)):
    """Upload menu items data from CSV or XLSX file."""
    try:
        created_items = await dashboard_service.upload_menu_items_csv(file)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
    return created_items


@router.post("/upload-sales-data", summary="Upload end-of-day sales data CSV/XLSX",
             dependencies=[Depends(check_permissions(["upload_sales"]))])
@log_route("Upload sales data CSV or XLSX")
async def upload_sales_data(
    file: UploadFile = File(...),
    overwrite: bool = Form(False),
    dashboard_service: DashboardService = Depends(get_dashboard_service)):
    """
    Upload sales data file (CSV or XLSX).
    If sales data exists for the dates and overwrite is False, raises 409 conflict.
    """
    try:
        inserted_sales = await dashboard_service.upload_sales_data(file, overwrite)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except HTTPException:
        raise  # re-raise HTTPExceptions to not mask them
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

    return {
        "message": f"Successfully uploaded {len(inserted_sales)} sales records.",
        "data": [
            {
                "sale_id": s.sale_id,
                "menu_item_id": s.menu_item_id,
                "quantity_sold": s.quantity_sold,
            }
            for s in inserted_sales
        ],
    }


@router.get("/sales-upload-template", summary="Download sales upload template XLSX")
@log_route("Download sales upload template XLSX")
async def download_sales_upload_template(
    dashboard_service: DashboardService = Depends(get_dashboard_service),
    default_date: Optional[str] = Query(
        None, description="Default sale timestamp in ISO format (e.g. 2025-06-11T00:00:00)"
    ),
):
    """Download an XLSX template file for sales data upload."""
    stream = await dashboard_service.generate_sales_upload_template_xlsx(default_date=default_date)

    # Build filename using provided default_date (first 10 chars) or UTC today
    if default_date:
        # default_date may be like '2025-06-11T00:00:00' — take date portion
        file_date = default_date.split("T")[0]
    else:
        file_date = datetime.utcnow().strftime("%Y-%m-%d")

    filename = f"sale_template_{file_date}.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get(
    "/sales-exist",
    summary="Check if sales exist for a date, optionally per channel",
    response_model=SalesConflictOut,
)
@log_route("Check existing sales by date/channels")
async def sales_exist(
    sale_date: str = Query(..., description="YYYY-MM-DD"),
    channels: Optional[List[str]] = Query(None, description="Filter by sales channels; include 'null' to check unspecified channel"),
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    return await dashboard_service.check_sales_conflicts(sale_date, channels)


@router.post(
    "/upload-sales-manual",
    summary="Upload end-of-day sales entries for a specific date",
    dependencies=[Depends(check_permissions(["upload_sales"]))],
)
@log_route("Upload sales manual JSON")
async def upload_sales_manual(
    payload: EodSalesEntriesIn,
    dashboard_service: DashboardService = Depends(get_dashboard_service),
):
    """Accept manual EOD sales entries for a single sale_date (YYYY-MM-DD).
    When overwrite=true, existing records on that date are deleted only for channels present in the submitted entries.
    """
    try:
        result = await dashboard_service.upload_sales_entries(payload)
        return {
            "message": f"Successfully uploaded {len(result)} sales records.",
            "data": [
                {
                    "sale_id": s.sale_id,
                    "menu_item_id": s.menu_item_id,
                    "quantity_sold": s.quantity_sold,
                }
                for s in result
            ],
        }
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")
