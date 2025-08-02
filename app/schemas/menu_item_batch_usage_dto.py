# app/schemas/menu_item_batch_usage_dto.py

from pydantic import BaseModel
from typing import Optional
from decimal import Decimal


class MenuItemBatchUsageBase(BaseModel):
    menu_item_id: int
    batch_recipe_id: int
    restaurant_id: int
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None


class MenuItemBatchUsageCreate(MenuItemBatchUsageBase):
    pass


class MenuItemBatchUsageUpdate(BaseModel):
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None


class MenuItemBatchUsage(MenuItemBatchUsageBase):
    class Config:
        orm_mode = True
