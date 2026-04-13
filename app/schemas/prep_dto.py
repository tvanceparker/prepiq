"""
Consolidated DTOs for the Prep section (batch recipes, batch recipe ingredients, prep schedule).
Follows the section-based pattern like admin_dto.py.
"""

from typing import Optional, List, Literal
from decimal import Decimal
from datetime import date
from pydantic import BaseModel, ConfigDict


BatchComponentType = Literal["ingredient", "batch"]
LifecycleAction = Literal["archive"]


# ---------------- Batch Recipes ----------------

class BatchRecipeBase(BaseModel):
    restaurant_id: int
    name: str
    description: Optional[str] = None
    yield_quantity: Optional[Decimal] = None
    yield_unit: Optional[str] = None
    estimated_prep_time_minutes: Optional[int] = None
    shelf_life_days: Optional[int] = None


class BatchRecipeIngredientUpdate(BaseModel):
    ingredient_id: Optional[int] = None
    reference_id: Optional[int] = None
    ingredient_type: Optional[BatchComponentType] = None
    quantity_used: Decimal
    unit: str


class BatchRecipeUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    yield_quantity: Optional[Decimal] = None
    yield_unit: Optional[str] = None
    estimated_prep_time_minutes: Optional[int] = None
    shelf_life_days: Optional[int] = None
    ingredients: Optional[List[BatchRecipeIngredientUpdate]] = None


class IngredientInput(BaseModel):
    ingredient_id: Optional[int] = None
    reference_id: Optional[int] = None
    ingredient_type: Optional[BatchComponentType] = None
    quantity_used: Decimal
    unit: str


class CreateBatchRecipeRequest(BaseModel):
    name: str
    description: Optional[str] = None
    yield_quantity: Decimal
    yield_unit: str
    estimated_prep_time_minutes: Optional[int] = None
    shelf_life_days: Optional[int] = None
    ingredients: List[IngredientInput]


class BatchRecipeCreate(BatchRecipeBase):
    pass


class BatchRecipeUpdate(BatchRecipeBase):
    pass


class BatchRecipe(BatchRecipeBase):
    batch_recipe_id: int
    model_config = ConfigDict(from_attributes=True)


# --------------- Batch Recipe Ingredients ---------------

class BatchRecipeIngredientBase(BaseModel):
    batch_recipe_id: int
    restaurant_id: int
    ingredient_id: Optional[int] = None
    reference_id: Optional[int] = None
    ingredient_type: Optional[BatchComponentType] = None
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None


class BatchRecipeIngredientCreate(BatchRecipeIngredientBase):
    restaurant_id: int
    batch_recipe_id: int
    quantity_used: Decimal
    unit: str


class BatchRecipeIngredientUpdateDTO(BaseModel):
    quantity_used: Optional[Decimal] = None
    unit: Optional[str] = None


class BatchRecipeIngredient(BatchRecipeIngredientBase):
    model_config = ConfigDict(from_attributes=True)


class BatchRecipeUsageRecipeReferenceDTO(BaseModel):
    recipe_id: int
    recipe_name: str
    is_active: bool


class BatchRecipeUsageBatchReferenceDTO(BaseModel):
    batch_recipe_id: int
    batch_recipe_name: str
    is_active: bool


class BatchRecipeUsageDTO(BaseModel):
    recipes: List[BatchRecipeUsageRecipeReferenceDTO]
    batches: List[BatchRecipeUsageBatchReferenceDTO]
    prep_schedule_count: int
    inventory_lot_count: int
    recipe_count: int
    batch_count: int


class BatchRecipeArchiveResponseDTO(BaseModel):
    message: str
    archived: bool
    lifecycle_action: Optional[LifecycleAction] = None
    usage: BatchRecipeUsageDTO


# ----------------- Prep Schedule -----------------

class PrepScheduleBase(BaseModel):
    restaurant_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    prep_date: Optional[date] = None
    quantity_needed: Optional[Decimal] = None
    quantity_prepped: Optional[Decimal] = None
    prep_batch_count: Optional[Decimal] = None
    prep_time_minutes_estimated: Optional[int] = None
    prep_time_minutes_actual: Optional[int] = None
    assigned_employee_id: Optional[int] = None
    status: Optional[str] = None


class PrepScheduleCreate(PrepScheduleBase):
    restaurant_id: int
    batch_recipe_id: int
    prep_date: date


class PrepScheduleUpdate(BaseModel):
    status: Optional[str] = None
    prep_time_minutes_actual: Optional[int] = None
    prep_batch_count: Optional[Decimal] = None


# ----------------- Prep Logs (Read-Only View) -----------------

class PrepLogResponse(BaseModel):
    """Response model for completed prep logs."""
    prep_id: int
    batch_recipe_id: int
    batch_recipe_name: str
    prep_date: date
    quantity_needed: Decimal
    quantity_prepped: Optional[Decimal] = None
    prep_batch_count: Optional[Decimal] = None
    prep_time_minutes_estimated: Optional[int] = None
    prep_time_minutes_actual: Optional[int] = None
    assigned_employee_id: Optional[int] = None
    assigned_employee_name: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    expiry_date: Optional[date] = None  # From inventory lot's spoilage_expected_date
    
    model_config = ConfigDict(from_attributes=True)


# ----------------- Prep Waste Logs -----------------

class WasteLogResponse(BaseModel):
    """Response model for waste/spoilage logs."""
    usage_id: int
    waste_date: date
    ingredient_id: int
    ingredient_name: str
    batch_recipe_id: Optional[int] = None
    batch_recipe_name: Optional[str] = None
    quantity_wasted: Decimal
    unit: str
    waste_type: str  # "waste" or "spoilage"
    reason: str  # "expired", "damaged", "overproduction", "prep_error", etc.
    cost_impact: Optional[Decimal] = None
    lot_id: Optional[int] = None
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class CreateWasteLogRequest(BaseModel):
    """Request to manually log waste."""
    ingredient_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    quantity_wasted: Decimal
    unit: str
    waste_type: str  # "waste" or "spoilage"
    reason: str
    notes: Optional[str] = None
