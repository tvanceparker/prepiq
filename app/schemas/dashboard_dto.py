# app/schemas/dashboard_dto.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict

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

