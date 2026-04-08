from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Union, Optional
from datetime import date
from app.schemas.sales_forecast_dto import (
    ForecastTableRow,
    ForecastTotalPerDay,
    ForecastTotalAggregate,
    TopForecastedItem,
    ForecastStateDTO,
    SalesBreakdownItem,
    SalesOverTimeItem,
    TopBottomItem,
    ForecastAccuracyChartRow,
    ForecastAccuracyTableRow,
    ComputedForecastAccuracyRow,
    SalesChannelBreakdown,
    SalesOverTimeByItem,
    WeekdaySalesAverage,
    SalesHeatmapData,
    SalesExplorerFilters,
    SalesExplorerRow,
    SaleUpdateDTO,
    StandardResponse,
    SaleCreateDTO,
    SaleReadDTO,
    SalesBreakdownProItem,
    SalesOverTimeProItem,
    TopBottomProItem,
    SalesDateRange,
)
from app.services.sales_forecast_service import SalesForecastService
from app.api.dependencies import get_sales_forecast_service
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/sales_forecast", tags=["Sales & Forecast"])

# BASIC ROUTES
# FOR UPCOMING FORECAST
@router.get("/upcoming_forecast/table", response_model=List[ForecastTableRow])
@log_route("Get Forecast Table")
async def get_forecast_table(
    start_date: date = Query(...),
    end_date: date = Query(...),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_upcoming_forecast_table_basic(start_date, end_date)


@router.get("/upcoming_forecast/totals", response_model=Union[List[ForecastTotalPerDay], ForecastTotalAggregate])
@log_route("Get Forecast Totals")
async def get_forecast_totals(
    start_date: date = Query(...),
    end_date: date = Query(...),
    mode: str = Query("per_day", enum=["per_day", "total"]),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_upcoming_forecast_totals_basic(start_date, end_date, mode)


@router.get("/upcoming_forecast/top_items", response_model=List[TopForecastedItem])
@log_route("Get Top Items")
async def get_top_items(
    start_date: date = Query(...),
    end_date: date = Query(...),
    limit: int = Query(5, ge=1),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_top_forecasted_items_basic(start_date, end_date, limit)


@router.get("/forecast_state", response_model=ForecastStateDTO)
@log_route("Get Forecast State")
async def get_forecast_state(
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_forecast_state()

#FOR MENU MIX INSIGHTS
@router.get("/sales_breakdown", response_model=List[SalesBreakdownItem])
@log_route("Get Sales Breakdown")
async def sales_breakdown(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_sales_breakdown(start_date, end_date, by_revenue)


@router.get("/sales_over_time", response_model=List[SalesOverTimeItem])
@log_route("Get Sales over Time")
async def sales_over_time(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_sales_over_time(start_date, end_date, by_revenue)


@router.get("/top_bottom_items", response_model=List[TopBottomItem])
@log_route("Get Top Bottom")
async def top_bottom_items(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    top: bool = Query(True),
    count: int = Query(3, ge=1, le=10),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_top_bottom_items(start_date, end_date, by_revenue, top, count)


# For Forecast Accuracy
# 📊 Daily Accuracy Chart (Stored)
@router.get("/accuracy-chart", response_model=List[ForecastAccuracyChartRow])
@log_route("Get Accuracy Chart")
async def get_forecast_accuracy_chart(
    start_date: date = Query(...),
    end_date: date = Query(...),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_daily_accuracy_chart_data(start_date, end_date)

# 📋 Stored Forecast Accuracy Table
@router.get("/accuracy-table", response_model=List[ForecastAccuracyTableRow])
@log_route("Get Accuracy Table")
async def get_forecast_accuracy_table(
    start_date: date = Query(...),
    end_date: date = Query(...),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_forecast_accuracy_table(start_date, end_date)

# 🔄 On-the-fly Computed Forecast Accuracy
@router.get("/accuracy-computation", response_model=List[ComputedForecastAccuracyRow])
async def get_computed_forecast_accuracy(
    start_date: date = Query(...),
    end_date: date = Query(...),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.compute_accuracy_from_raw_data(start_date, end_date)

#For Sales Patterns
@router.get("/patterns/sales_over_time_by_item", response_model=List[SalesOverTimeByItem])
@log_route("Get Sales over Time")
async def sales_over_time_by_item(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_sales_over_time_by_item(start_date, end_date, by_revenue)

@router.get("/patterns/heatmap_data", response_model=SalesHeatmapData)
@log_route("Get Sales Heatmap")
async def sales_heatmap_data(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    normalize: bool = Query(False),  # NEW
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_sales_heatmap_data(start_date, end_date, by_revenue, normalize)



@router.get("/patterns/weekday_avg", response_model=List[WeekdaySalesAverage])
@log_route("Get Weekeday Average")
async def weekday_avg(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_weekday_sales_avg(start_date, end_date,by_revenue)

@router.get("/patterns/channel_breakdown", response_model=List[SalesChannelBreakdown])
@log_route("Get Channel Breakdown")
async def channel_breakdown(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_sales_channel_breakdown(start_date, end_date,by_revenue)

#For Sales Explorer
@router.get(
    "/sales_explorer/table",
    response_model=List[SalesExplorerRow],
    summary="Get filtered raw sales data for table view"
)
@log_route("Get Sales Explorer Table")
async def get_sales_explorer_table(
    start_date: date = Query(...),
    end_date: date = Query(...),
    menu_item_ids: Optional[List[int]] = Query(None),
    sales_channels: Optional[List[str]] = Query(None),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.get_sales_data(
        start_date=start_date,
        end_date=end_date,
        menu_item_ids=menu_item_ids,
        sales_channels=sales_channels,
    )


@router.get(
    "/sales_explorer/download_excel",
    summary="Download filtered sales data as Excel"
)
@log_route("Download Sales to Excel")
async def download_sales_explorer_excel(
    start_date: date = Query(...),
    end_date: date = Query(...),
    menu_item_ids: Optional[List[int]] = Query(None),
    sales_channels: Optional[List[str]] = Query(None),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    return await service.export_sales_excel(
        start_date=start_date,
        end_date=end_date,
        menu_item_ids=menu_item_ids,
        sales_channels=sales_channels,
    )

@router.get("/date_range", response_model=SalesDateRange)
@log_route("Get Sales Date Range")
async def get_sales_date_range(
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    min_date, max_date = await service.get_sales_date_bounds()
    return {"min_date": min_date, "max_date": max_date}

@router.patch("/sales/{sale_id}", response_model=StandardResponse)
async def update_sale(
    sale_id: int,
    dto: SaleUpdateDTO,
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    updated_sale_orm = await service.update_sale(sale_id, dto)
    if not updated_sale_orm:
        raise HTTPException(status_code=404, detail="Sale not found")

    updated_sale = SaleReadDTO.model_validate(updated_sale_orm)
    return StandardResponse(success=True, message="Sale updated successfully", data=updated_sale)

# Updated POST route for sale creation
@router.post("/sales", response_model=StandardResponse)
async def create_sale(
    dto: SaleCreateDTO,
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    try:
        sale_orm = await service.create_sale(dto)
        sale = SaleReadDTO.model_validate(sale_orm)
        return StandardResponse(success=True, message="Sale created", data=sale)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# PRO TIER: Menu Mix Insights with Cost Analysis
# ============================================================================

@router.get("/sales_breakdown_pro", response_model=List[SalesBreakdownProItem])
@log_route("Get Sales Breakdown (Pro)")
async def sales_breakdown_pro(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    """
    Pro tier sales breakdown including recipe costs, margins, and profitability metrics.
    Requires Pro or Master subscription tier.
    """
    if service.subscription_tier not in ["pro", "master"]:
        raise HTTPException(status_code=403, detail="Pro or Master tier required")
    
    return await service.get_sales_breakdown_pro(start_date, end_date, by_revenue)


@router.get("/sales_over_time_pro", response_model=List[SalesOverTimeProItem])
@log_route("Get Sales Over Time (Pro)")
async def sales_over_time_pro(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    """
    Pro tier sales over time with cost and profitability analysis.
    Requires Pro or Master subscription tier.
    """
    if service.subscription_tier not in ["pro", "master"]:
        raise HTTPException(status_code=403, detail="Pro or Master tier required")
    
    return await service.get_sales_over_time_pro(start_date, end_date, by_revenue)


@router.get("/top_bottom_items_pro", response_model=List[TopBottomProItem])
@log_route("Get Top/Bottom Items (Pro)")
async def top_bottom_items_pro(
    start_date: date = Query(...),
    end_date: date = Query(...),
    by_revenue: bool = Query(False),
    top: bool = Query(True),
    count: int = Query(10, ge=1, le=20),
    service: SalesForecastService = Depends(get_sales_forecast_service),
):
    """
    Pro tier top/bottom performers with profitability analysis.
    Requires Pro or Master subscription tier.
    """
    if service.subscription_tier not in ["pro", "master"]:
        raise HTTPException(status_code=403, detail="Pro or Master tier required")
    
    return await service.get_top_bottom_items_pro(start_date, end_date, by_revenue, top, count)
