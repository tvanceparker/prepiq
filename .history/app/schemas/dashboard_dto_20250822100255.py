# app/schemas/dashboard_dto.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List

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

