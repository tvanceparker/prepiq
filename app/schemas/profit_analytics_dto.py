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


class DishProfitabilityItem(BaseModel):
    menu_item_id: int
    name: str
    category: Optional[str] = None
    price: float
    ingredient_cost: float
    batch_cost: float
    total_food_cost: float
    gross_margin: float
    food_cost_pct: float
    sales_count: Optional[int] = None
    revenue: Optional[float] = None
    contribution_pct: Optional[float] = None


class DishProfitabilityResponse(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    average_margin: float
    average_food_cost_pct: float
    total_items: int
    items: List[DishProfitabilityItem]
