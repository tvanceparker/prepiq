# app/schemas/dashboard_dto.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

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
