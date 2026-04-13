from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import List, Union, Optional, Literal, Any


class ForecastTableRow(BaseModel):
    date: date
    menu_item_id: int
    menu_item_name: str
    forecasted_quantity: int


class ForecastTotalPerDay(BaseModel):
    date: date
    forecasted_quantity: int
    forecasted_revenue: float


class ForecastTotalAggregate(BaseModel):
    forecasted_quantity: int
    forecasted_revenue: float


class TopForecastedItem(BaseModel):
    menu_item_id: int
    name: str
    forecasted_quantity: int


class ForecastStateDTO(BaseModel):
    forecast_source: Literal["cached", "fresh"]
    forecast_source_type: Literal["eod", "on_demand"]
    forecast_generated_at: Optional[datetime]
    forecast_reused: bool
    forecast_stale: bool
    forecast_status: Literal["ready", "stale", "degraded", "failed"]
    forecast_status_message: Optional[str]
    forecast_authority: Literal["finalized_eod", "on_demand_preview", "unavailable"]
    forecast_usage_action: Literal["allow", "review", "block"]
    forecast_usage_message: Optional[str]
    forecast_confidence_score: Optional[float] = None
    forecast_version: Optional[int] = None

class SalesBreakdownItem(BaseModel):
    menu_item_id: int
    menu_item_name: str
    category: Optional[str]
    sales_channel: Optional[str]
    metric: float  # quantity or revenue
    percent_of_total: float

class SalesOverTimeItem(BaseModel):
    sale_date: str
    menu_item_id: int
    menu_item_name: str
    metric: float

class TopBottomItem(BaseModel):
    menu_item_id: int
    menu_item_name: str
    metric: float

class ForecastAccuracyChartRow(BaseModel):
    date: date
    menu_item_id: int
    menu_item_name: str
    error_percentage: float
    forecast_error: int

class ForecastAccuracyTableRow(BaseModel):
    date: Optional[date]  # for daily entries
    forecast_period_start: Optional[date]
    forecast_period_end: Optional[date]
    menu_item_id: int
    menu_item_name: str
    forecasted: float
    actual: float
    forecast_error: Optional[float]
    error_percentage: Optional[float]
    source: Literal["summary", "daily"]

class ComputedForecastAccuracyRow(BaseModel):
    date: date
    menu_item_id: int
    menu_item_name: str
    forecasted: int
    actual: int
    error: int
    error_percentage: Optional[float]

class SalesOverTimeByItem(BaseModel):
    date: date
    menu_item_id: int
    menu_item_name: str
    value: float

class SalesHeatmapByCategory(BaseModel):
    category: str
    date: date
    quantity_sold: float

class WeekdaySalesAverage(BaseModel):
    weekday: int  # 0 = Monday
    average_value: float

class SalesChannelBreakdown(BaseModel):
    sales_channel: str
    value: float
    percent_of_total: float

class DailyQuantity(BaseModel):
    date: date
    value: float

class MenuItemHeatmapEntry(BaseModel):
    menu_item_id: int
    menu_item_name: str
    date: date
    value: float
    normalized_value: Optional[float] = None

class CategoryHeatmapEntry(BaseModel):
    category: str
    date: date
    value: float
    normalized_value: Optional[float] = None

class SalesHeatmapData(BaseModel):
    overall: List[DailyQuantity]
    by_menu_item: List[MenuItemHeatmapEntry]
    by_category: List[CategoryHeatmapEntry]

class SalesExplorerRow(BaseModel):
    sale_id: int
    sale_timestamp: datetime
    menu_item_id: int
    menu_item_name: str
    quantity_sold: int
    sales_channel: Optional[str]
    revenue: float

class SalesExplorerFilters(BaseModel):
    start_date: Optional[date]
    end_date: Optional[date]
    menu_item_ids: Optional[list[int]] = None
    sales_channels: Optional[list[str]] = None


class SaleUpdateDTO(BaseModel):
    restaurant_id: Optional[int] = None
    sale_timestamp: Optional[datetime]
    menu_item_id: Optional[int]
    quantity_sold: Optional[int]
    sales_channel: Optional[str]

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class SaleCreateDTO(BaseModel):
    restaurant_id: Optional[int] = None
    sale_timestamp: Optional[datetime] = None
    menu_item_id: int
    quantity_sold: int
    sales_channel: Optional[str]

class SaleReadDTO(BaseModel):
    sale_id: int
    restaurant_id: int
    sale_timestamp: datetime
    menu_item_id: int
    quantity_sold: int
    sales_channel: Optional[str]

    model_config = ConfigDict(from_attributes=True)

# ==========================================================================
# SALES DATE RANGE
# ==========================================================================

class SalesDateRange(BaseModel):
    min_date: Optional[date] = None
    max_date: Optional[date] = None

# ============================================================================
# PRO TIER: Menu Mix Insights with Cost Analysis
# ============================================================================

class SalesBreakdownProItem(BaseModel):
    """Pro tier sales breakdown with cost analysis"""
    menu_item_id: int
    menu_item_name: str
    category: Optional[str]
    sales_channel: Optional[str]
    quantity_sold: int
    revenue: float
    recipe_cost: float
    total_cost: float
    contribution_margin: float
    gross_margin_pct: float
    food_cost_pct: float
    metric: float
    percent_of_total: float


class SalesOverTimeProItem(BaseModel):
    """Pro tier sales over time with profitability"""
    sale_date: date
    menu_item_id: int
    menu_item_name: str
    quantity: int
    revenue: float
    cost: float
    contribution_margin: float
    metric: float


class TopBottomProItem(BaseModel):
    """Pro tier top/bottom items with profitability"""
    menu_item_id: int
    menu_item_name: str
    quantity_sold: int
    revenue: float
    recipe_cost: float
    total_cost: float
    contribution_margin: float
    gross_margin_pct: float
    food_cost_pct: float
    metric: float
