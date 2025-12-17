from datetime import date
from typing import List, Optional
from pydantic import BaseModel


class WasteTrendPoint(BaseModel):
    bucket_start: date
    total_quantity: float
    total_cost: float


class WasteBreakdownItem(BaseModel):
    key: str
    label: str
    total_quantity: float
    total_cost: float
    usage_type: Optional[str] = None
    reason: Optional[str] = None


class WasteInsight(BaseModel):
    title: str
    detail: str
    action: Optional[str] = None
    severity: str = "info"


class WasteAnalyticsResponse(BaseModel):
    start_date: Optional[date]
    end_date: Optional[date]
    total_waste_quantity: float
    total_waste_cost: float
    average_daily_cost: float
    trend: List[WasteTrendPoint]
    by_type: List[WasteBreakdownItem]
    top_ingredients: List[WasteBreakdownItem]
    top_reasons: List[WasteBreakdownItem]
    insights: List[WasteInsight]
