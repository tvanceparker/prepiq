# app/schemas/ingredient_supplier_dto.py

from pydantic import BaseModel
from typing import Optional
from datetime import date


class IngredientSupplierBase(BaseModel):
    ingredient_id: int
    supplier_id: int
    cost_per_unit: float
    lead_time_days: int
    spoilage_rate: Optional[float] = None
    shelf_life_days: Optional[int] = None
    preferred: Optional[bool] = False
    contract_start_date: Optional[date] = None  # Correcting this to use date
    contract_end_date: Optional[date] = None  # Correcting this to use date
    min_order_quantity: Optional[int] = None
    supplier_priority: Optional[int] = None
    pack_size: Optional[int] = None
    quantity_per_pack_item: Optional[float] = None


class IngredientSupplierCreate(IngredientSupplierBase):
    pass


class IngredientSupplierUpdate(IngredientSupplierBase):
    pass


class IngredientSupplier(IngredientSupplierBase):
    ingredient_id: int
    supplier_id: int

    class Config:
        orm_mode = True
