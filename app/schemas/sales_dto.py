# app/schemas/sales_dto.py

from pydantic import BaseModel
from typing import Optional


class SalesBase(BaseModel):
    restaurant_id: int
    menu_item_id: int
    quantity_sold: int
    sales_channel: Optional[str] = None


class SalesCreate(SalesBase):
    pass


class SalesUpdate(SalesBase):
    pass


class Sales(SalesBase):
    sale_id: int

    class Config:
        orm_mode = True
