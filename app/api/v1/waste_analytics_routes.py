from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user, build_service
from app.schemas.waste_analytics_dto import WasteAnalyticsResponse
from app.services.waste_analytics_service import WasteAnalyticsService
from app.utils.logger_helpers import log_route

router = APIRouter(prefix="/waste_analytics", tags=["waste_analytics"])


@router.get("/summary", response_model=WasteAnalyticsResponse)
@log_route()
async def get_waste_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    _: dict = Depends(get_current_user),
    service: WasteAnalyticsService = Depends(build_service(WasteAnalyticsService)),
):
    return await service.get_summary(start_date=start_date, end_date=end_date)
