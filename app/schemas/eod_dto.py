from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


class EODLaunchSummaryDTO(BaseModel):
    status: Literal["processing"]
    detail: str
    run_date: date
    trigger_source: Literal["manual"]
    run_mode: Literal["idempotent_run", "force_rerun"]
    protections: List[str]


class EODStageStatusDTO(BaseModel):
    stage: str
    completed: bool
    duration_ms: Optional[int] = None


class EODRunErrorDTO(BaseModel):
    stage: str
    message: str
    ts: Optional[str] = None


class EODForecastStateDTO(BaseModel):
    forecast_generated_at: Optional[datetime] = None
    forecast_stale: bool
    forecast_status: Literal["ready", "stale", "degraded", "failed"]
    forecast_status_message: Optional[str] = None


class EODRunCountsDTO(BaseModel):
    sales_usage_log_count: int = 0
    forecast_menu_items_processed: int = 0
    purchase_order_suggestion_count: int = 0
    purchase_orders_created: int = 0
    open_discrepancy_count: int = 0


class EODRepairTargetDTO(BaseModel):
    alert_id: Optional[int] = None
    ingredient_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    item_name: Optional[str] = None
    message: str
    shortfall_quantity: float
    unit: Optional[str] = None


class EODRunSummaryDTO(BaseModel):
    run_date: date
    status: Literal["processing", "success", "partial", "failed"]
    status_message: str
    finalized: bool
    running: bool
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    stages: List[EODStageStatusDTO]
    errors: List[EODRunErrorDTO]
    forecast: EODForecastStateDTO
    counts: EODRunCountsDTO
    repair_targets: List[EODRepairTargetDTO]