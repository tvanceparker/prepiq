# app/schemas/inventory_lot_dto.py

from pydantic import BaseModel
from datetime import date
from typing import Union, Optional
from decimal import Decimal


class InventoryLotBase(BaseModel):
    inventory_id: int  # The inventory to which this lot belongs
    restaurant_id: int  # The restaurant associated with this lot
    delivery_date: date  # Date of the lot delivery
    spoilage_expected_date: date  # Expiry date
    quantity: float  # Quantity of the ingredient in the lot
    unit: str  # Unit of the ingredient, e.g., kg, liter
    supplier_id: int


class InventoryLotCreate(InventoryLotBase):
    inventory_id: int
    ingredient_id: int
    restaurant_id: int
    ingredient_supplier_id: int
    delivery_date: date
    spoilage_expected_date: date
    quantity: Decimal
    unit: str
    total_received: Decimal


class InventoryLotIn(BaseModel):
    ingredient_supplier_id: int
    total_received: Union[float, int]
    delivery_date: date


class InventoryLotUpdate(BaseModel):
    quantity: Optional[float] = None


class InventoryLot(InventoryLotBase):
    lot_id: int  # The unique ID of the inventory lot

    class Config:
        orm_mode = True
