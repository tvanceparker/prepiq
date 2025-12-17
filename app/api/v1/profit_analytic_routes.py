# app/api/v1/profit_analytic_routes.py

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_profit_analytics_service
from app.schemas.profit_analytics_dto import IngredientCostTrendsResponse
from app.services.profit_analytics_service import ProfitAnalyticsService
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/profit_analytics", tags=["Profit Analytics"])


@router.get("/get_sales")
async def get_sales(
    profit_analytics_service: ProfitAnalyticsService = Depends(
        get_profit_analytics_service
    ),
):
    return await profit_analytics_service.get_sales()


@router.get(
    "/ingredient_cost_trends",
    response_model=IngredientCostTrendsResponse,
    summary="Aggregated ingredient spend over time",
)
@log_route("Get Ingredient Cost Trends")
async def ingredient_cost_trends(
    start_date: date = Query(..., description="Inclusive start date"),
    end_date: date = Query(..., description="Inclusive end date"),
    granularity: str = Query("weekly", enum=["daily", "weekly"]),
    ingredient_ids: Optional[List[int]] = Query(None),
    supplier_ids: Optional[List[int]] = Query(None),
    profit_analytics_service: ProfitAnalyticsService = Depends(
        get_profit_analytics_service
    ),
):
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be on or before end_date")
    return await profit_analytics_service.get_ingredient_cost_trends(
        start_date=start_date,
        end_date=end_date,
        granularity=granularity,  # type: ignore[arg-type]
        ingredient_ids=ingredient_ids,
        supplier_ids=supplier_ids,
    )
