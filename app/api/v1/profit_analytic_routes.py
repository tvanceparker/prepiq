# app/api/v1/profit_analytic_routes.py


from fastapi import APIRouter, Depends
from app.services.profit_analytics_service import ProfitAnalyticsService
from app.api.dependencies import get_profit_analytics_service
from typing import Dict, List

router = APIRouter(prefix="/profit_analytics", tags=["Profit Analytics"])


@router.get("/get_sales")
async def get_sales(
    profit_analytics_service: ProfitAnalyticsService = Depends(
        get_profit_analytics_service
    ),
):
    return await profit_analytics_service.get_sales()
