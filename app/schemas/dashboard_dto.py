# app/schemas/dashboard_dto.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Dict, List, Optional

class MenuItemCreate(BaseModel):
    name: str
    category: Optional[str] = None
    price: float
    is_active: Optional[bool] = True

class MenuItemUpdate(BaseModel):
    name: Optional[str]
    category: Optional[str]
    price: Optional[float]
    is_active: Optional[bool]

class MenuItemOut(BaseModel):
    menu_item_id: int
    name: str
    category: Optional[str]
    price: float
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


# ---- Sales upload (manual JSON) DTOs ----
class SalesEntryIn(BaseModel):
    menu_item_id: int
    quantity_sold: int = Field(ge=0)
    sales_channel: Optional[str] = None


class EodSalesEntriesIn(BaseModel):
    """
    Manual end-of-day sales submission for a single date.
    If overwrite is true, existing sales for that date are removed before insert.
    """
    sale_date: str  # YYYY-MM-DD
    entries: List[SalesEntryIn]
    overwrite: Optional[bool] = False

class SalesConflictOut(BaseModel):
    sale_date: str
    # channel -> count. Use None for unspecified channel.
    conflicts: Dict[Optional[str], int]
    model_config = ConfigDict(from_attributes=True)


class SalesUploadRowErrorOut(BaseModel):
    row_number: int
    code: str
    message: str
    row_data: Dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(from_attributes=True)


# ---- Dashboard output DTOs ----
class ForecastedSalesBasic(BaseModel):
    forecasted_quantity: int
    forecasted_revenue: float
    model_config = ConfigDict(from_attributes=True)


class TopForecastedItem(BaseModel):
    menu_item_id: int
    name: str
    forecasted_quantity: int
    model_config = ConfigDict(from_attributes=True)


class AccuracyBasicOut(BaseModel):
    accuracy_percent: Optional[float]
    note: str
    model_config = ConfigDict(from_attributes=True)


class SaleOut(BaseModel):
    sale_id: int
    menu_item_id: int
    quantity_sold: int
    sales_channel: Optional[str] = None
    sale_timestamp: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class DailyOverviewOut(BaseModel):
    forecasted_sales_today: Optional[ForecastedSalesBasic]
    top_5_items_today: List[TopForecastedItem]
    accuracy_yesterday: Optional[AccuracyBasicOut]
    model_config = ConfigDict(from_attributes=True)


class EodUploadResponse(BaseModel):
    message: str
    data: List[SaleOut]
    model_config = ConfigDict(from_attributes=True)


class SalesUploadResponse(BaseModel):
    import_id: str
    source: str
    overwrite: bool
    attempted_rows: int
    inserted_rows: int
    skipped_rows: int
    duplicate_rows: int
    overwritten_rows: int
    sale_dates: List[str] = Field(default_factory=list)
    channels: List[Optional[str]] = Field(default_factory=list)
    row_errors: List[SalesUploadRowErrorOut] = Field(default_factory=list)
    message: str
    data: List[SaleOut] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)


# ---- Live Operations DTOs ----
class CurrentShiftOut(BaseModel):
    clocked_in: int
    scheduled: int
    on_break: int
    model_config = ConfigDict(from_attributes=True)


class OrderFlowOut(BaseModel):
    pending: int
    in_progress: int
    ready: int
    completed_today: int
    avg_prep_time: float  # minutes
    model_config = ConfigDict(from_attributes=True)


class TodaysPaceOut(BaseModel):
    current_sales: float
    forecast_sales: float
    percentage: float
    pace_vs_forecast: str  # on_track, ahead, behind
    model_config = ConfigDict(from_attributes=True)


class ActiveOrderOut(BaseModel):
    order_id: int
    table: str
    items: int
    time_elapsed: int  # minutes
    status: str
    server: str
    model_config = ConfigDict(from_attributes=True)


class KitchenStatusOut(BaseModel):
    grill: str
    fryer: str
    salad: str
    dessert: str
    model_config = ConfigDict(from_attributes=True)


class UpcomingDeliveryOut(BaseModel):
    supplier: str
    eta: str
    items: str
    model_config = ConfigDict(from_attributes=True)


class LiveOperationsOut(BaseModel):
    current_shift: CurrentShiftOut
    order_flow: OrderFlowOut
    todays_pace: TodaysPaceOut
    active_orders: List[ActiveOrderOut]
    kitchen_status: KitchenStatusOut
    upcoming_deliveries: List[UpcomingDeliveryOut]
    model_config = ConfigDict(from_attributes=True)


# ---- Quick Analytics DTOs ----
class AnalyticsSummaryOut(BaseModel):
    total_sales: float
    total_orders: int
    avg_order_value: float
    total_customers: int
    wow_sales_change: float
    wow_orders_change: float
    wow_avg_change: float
    wow_customers_change: float
    model_config = ConfigDict(from_attributes=True)


class DailySalesOut(BaseModel):
    date: str
    sales: float
    orders: int
    customers: int
    model_config = ConfigDict(from_attributes=True)


class ItemPerformanceOut(BaseModel):
    name: str
    units: int
    revenue: float
    trend: str  # up, down, neutral
    change: float  # percentage
    model_config = ConfigDict(from_attributes=True)


class QuickAnalyticsOut(BaseModel):
    summary: AnalyticsSummaryOut
    daily_sales: List[DailySalesOut]
    top_items: List[ItemPerformanceOut]
    bottom_items: List[ItemPerformanceOut]
    hourly_pattern: List[int]
    model_config = ConfigDict(from_attributes=True)


# ---- Full Daily Overview DTOs ----
class InventoryAlertOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    current_quantity: float
    unit: str
    reorder_point: float
    status: str  # critical, low, warning
    model_config = ConfigDict(from_attributes=True)


class PrepTaskOut(BaseModel):
    batch_recipe_id: int
    batch_recipe_name: str
    scheduled_quantity: int
    completed_quantity: int
    prep_date: str
    status: str  # pending, in_progress, completed
    model_config = ConfigDict(from_attributes=True)


class MenuPerformanceOut(BaseModel):
    menu_item_id: int
    name: str
    category: Optional[str]
    sales_today: int
    revenue_today: float
    forecast_today: int
    variance: float  # percentage
    model_config = ConfigDict(from_attributes=True)


class BatchRecipeSummaryOut(BaseModel):
    total_batches: int
    completed_today: int
    pending_today: int
    avg_completion_rate: float
    model_config = ConfigDict(from_attributes=True)


class InventorySummaryOut(BaseModel):
    total_ingredients: int
    critical_stock: int
    low_stock: int
    healthy_stock: int
    total_value: float
    model_config = ConfigDict(from_attributes=True)


class DeliveryItemOut(BaseModel):
    ingredient_name: str
    quantity_ordered: float
    unit: str
    model_config = ConfigDict(from_attributes=True)


class ExpectedDeliveryOut(BaseModel):
    order_id: int
    supplier_name: str
    expected_delivery_date: str
    order_date: str
    status: str
    total_items: int
    total_order_price: float
    items: List[DeliveryItemOut]
    model_config = ConfigDict(from_attributes=True)


class ProDailyOverviewOut(BaseModel):
    # Core metrics (from basic)
    forecasted_sales_today: Optional[ForecastedSalesBasic]
    top_5_items_today: List[TopForecastedItem]
    accuracy_yesterday: Optional[AccuracyBasicOut]
    
    # Enhanced Pro metrics
    inventory_summary: InventorySummaryOut
    inventory_alerts: List[InventoryAlertOut]
    prep_tasks_today: List[PrepTaskOut]
    batch_recipe_summary: BatchRecipeSummaryOut
    menu_performance_today: List[MenuPerformanceOut]
    expected_deliveries_today: List[ExpectedDeliveryOut]
    
    # Quick stats
    total_recipes: int
    active_menu_items: int
    staff_scheduled_today: int
    
    model_config = ConfigDict(from_attributes=True)

