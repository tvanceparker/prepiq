from datetime import date
from typing import List, Literal, Optional
from pydantic import BaseModel


CostGranularity = Literal["daily", "weekly"]


class IngredientCostTrendPoint(BaseModel):
    bucket_start: date
    total_cost: float
    total_quantity: Optional[float] = None
    avg_unit_price: Optional[float] = None


class IngredientCostTrendSeries(BaseModel):
    ingredient_id: int
    ingredient_name: str
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    unit: Optional[str] = None
    points: List[IngredientCostTrendPoint]
    total_cost: float
    total_quantity: Optional[float] = None
    avg_unit_price: Optional[float] = None


class IngredientCostTrendsResponse(BaseModel):
    granularity: CostGranularity
    start_date: date
    end_date: date
    total_cost: float
    series: List[IngredientCostTrendSeries]
