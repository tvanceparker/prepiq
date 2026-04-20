from pydantic import BaseModel
from pydantic import ConfigDict
from typing import Optional, List, Union, Literal
from datetime import date, datetime
from decimal import Decimal

ReplenishmentPolicyType = Literal[
    "fresh_perishable",
    "stable_stocked",
    "recipe_dependent",
    "intermittent_low_turn",
]
PolicyAssignmentMode = Literal["system", "manual"]
OrderScheduleType = Literal["ad_hoc", "fixed_days_of_week", "every_n_days"]
CadenceSource = Literal["manual", "inferred", "default"]
WeekdayCode = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

class PurchaseOrderItemDTO(BaseModel):
    order_item_id: int
    order_id: int
    ingredient_id: int
    ingredient_name: str
    ingredient_supplier_id: Optional[int]
    quantity_ordered: float
    quantity_received: Optional[float] = None
    variance_quantity: Optional[float] = None
    variance_status: Optional[Literal["matched", "short", "over"]] = None
    unit: str
    unit_price: float
    total_item_price: float


class PurchaseOrderReviewItemDTO(BaseModel):
    ingredient_id: int
    ingredient_name: str
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    quantity_to_order: Optional[float] = None
    packs_to_order: Optional[int] = None
    unit: Optional[str] = None
    line_total: Optional[float] = None
    lead_time_days: Optional[int] = None
    lead_demand: Optional[float] = None
    shelf_demand: Optional[float] = None
    explanation: Optional["POReorderExplanationDTO"] = None


class PurchaseOrderReviewContextDTO(BaseModel):
    source_type: Literal["manual", "suggestion", "eod_auto"] = "manual"
    source_run_date: Optional[date] = None
    explanation_items: List[PurchaseOrderReviewItemDTO] = []

class PurchaseOrderCreateItemDTO(BaseModel):
    ingredient_id: int
    ingredient_supplier_id: Optional[int]
    quantity_ordered: float
    unit: str
    unit_price: float
    notes: Optional[str] = None

class PurchaseOrderCreateDTO(BaseModel):
    supplier_id: Optional[int] = None
    expected_delivery_date: Optional[date]
    items: List[PurchaseOrderCreateItemDTO]
    notes: Optional[str] = None


class PurchaseOrderItemUpdateDTO(BaseModel):
    quantity_ordered: Optional[float] = None
    unit_price: Optional[float] = None
    unit: Optional[str] = None
    ingredient_supplier_id: Optional[int] = None


class PurchaseOrderReceiptDTO(BaseModel):
    actual_delivery_date: Optional[date] = None
    received_items: List["PurchaseOrderReceiptItemInDTO"] = []


class PurchaseOrderReceiptItemInDTO(BaseModel):
    order_item_id: int
    quantity_received: float


class PurchaseOrderReceiptItemSummaryDTO(BaseModel):
    order_item_id: int
    ingredient_id: int
    lot_id: int
    quantity_ordered: float
    quantity_received: float
    variance_quantity: float
    variance_status: Literal["matched", "short", "over"]
    unit: str
    receipt_status: Literal["received", "already_received"]


class PurchaseOrderReceiptSummaryDTO(BaseModel):
    order_id: int
    status: Literal["delivered"]
    actual_delivery_date: date
    receipt_mode: Literal["received", "resumed", "already_received"]
    requested_item_count: int
    newly_received_item_count: int
    already_received_item_count: int
    received_items: List[PurchaseOrderReceiptItemSummaryDTO]

class PurchaseOrderDTO(BaseModel):
    order_id: int
    restaurant_id: int
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    order_date: date
    expected_delivery_date: Optional[date]
    actual_delivery_date: Optional[date]
    status: str
    total_order_price: float
    items: List[PurchaseOrderItemDTO]
    notes: Optional[str] = None
    expected_delivery_stale: bool = False
    expected_delivery_status_message: Optional[str] = None
    review_context: Optional[PurchaseOrderReviewContextDTO] = None


class PurchaseOrderCreateResultDTO(BaseModel):
    order_id: int
    total_order_price: float
    status: Literal["cart"]


class PurchaseOrderStatusUpdateResultDTO(BaseModel):
    order_id: int
    status: str
    expected_delivery_date: Optional[date] = None
    expected_delivery_refreshed: bool = False


class PurchaseOrderItemAddResultDTO(BaseModel):
    order_item_id: int
    order_total_price: float


class PurchaseOrderItemUpdateResultDTO(BaseModel):
    order_item_id: int
    order_id: int
    ingredient_id: int
    ingredient_supplier_id: Optional[int] = None
    quantity_ordered: float
    unit: str
    unit_price: float
    total_item_price: float
    order_total_price: float


class PurchaseOrderItemDeleteResultDTO(BaseModel):
    order_item_id: int
    removed: bool
    order_total_price: float


class PurchaseOrderDeleteResultDTO(BaseModel):
    order_id: int
    deleted: bool
    status_before_delete: str
    message: str


class LastEodDateDTO(BaseModel):
    last_eod_run_date: Optional[date] = None


class InventoryForecastStateDTO(BaseModel):
    forecast_source: Literal["cached", "fresh"]
    forecast_source_type: Literal["eod", "on_demand"]
    forecast_run_date: Optional[date] = None
    forecast_generated_at: Optional[datetime] = None
    forecast_reused: bool
    forecast_stale: bool
    forecast_status: Literal["ready", "stale", "degraded", "failed"]
    forecast_status_message: Optional[str] = None
    forecast_authority: Literal["finalized_eod", "on_demand_preview", "unavailable"]
    forecast_usage_action: Literal["allow", "review", "block"]
    forecast_usage_message: Optional[str] = None
    forecast_confidence_score: Optional[float] = None
    forecast_version: Optional[int] = None


class POWhyReorderDTO(BaseModel):
    current_stock: Optional[float] = None
    total_stock: Optional[float] = None
    excluded_expiring_stock: Optional[float] = None
    projected_waste_quantity: Optional[float] = None
    usable_until_date: Optional[date] = None
    fefo_applied: bool = False
    current_unit: str
    reorder_point: Optional[float] = None
    lead_demand: Optional[float] = None
    shelf_demand: Optional[float] = None
    safety_stock: Optional[float] = None
    reorder_target: Optional[float] = None
    effective_lead_days: Optional[int] = None
    coverage_days: Optional[int] = None
    protection_window_days: Optional[int] = None


class POQuantityFactorsDTO(BaseModel):
    raw_order_quantity: Optional[float] = None
    buffered_quantity: Optional[float] = None
    final_quantity_before_pack_rounding: Optional[float] = None
    converted_quantity_needed: Optional[float] = None
    pack_size: float
    quantity_per_pack_item: Optional[float] = None
    quantity_per_pack: Optional[float] = None
    packs_to_order: int
    total_quantity_ordered: Optional[float] = None
    inventory_unit: Optional[str] = None
    supplier_unit: str


class POPolicyFactorsDTO(BaseModel):
    service_level_z: Optional[float] = None
    target_service_level: Optional[float] = None
    service_level_source: Optional[str] = None
    demand_source: Optional[str] = None
    reorder_method: Optional[str] = None
    policy_type: Optional[str] = None
    policy_assignment_mode: Optional[str] = None
    policy_buffer_quantity: Optional[float] = None
    abc_class: str
    abc_multiplier: Optional[float] = None
    moq: Optional[float] = None
    moq_floor: Optional[float] = None
    max_allowed: Optional[float] = None


class POSupplierFactorsDTO(BaseModel):
    selected_supplier: str
    selection_rule: str
    preferred_supplier_available: bool
    selected_supplier_priority: Optional[int] = None
    selected_supplier_preferred: bool
    pricing_available: bool
    order_schedule_type: Optional[str] = None
    review_period_days: Optional[int] = None
    allowed_order_days: List[str] = []
    allowed_delivery_days: List[str] = []
    next_order_date: Optional[date] = None
    next_delivery_date: Optional[date] = None
    cadence_source: Optional[str] = None
    cadence_confidence_score: Optional[float] = None


class POAssumptionFlagsDTO(BaseModel):
    inventory_source: str
    lead_time_source: str
    moq_source: str
    shelf_life_source: str
    unit_conversion_fallback: bool
    pricing_missing: bool
    abc_defaulted: bool
    policy_inferred: bool = False
    coverage_capped_by_shelf_life: bool = False
    cadence_warnings: List[str] = []
    service_level_source: Optional[str] = None
    usable_stock_applied: bool = False
    inventory_conversion_fallback: bool = False


class POReorderExplanationDTO(BaseModel):
    summary: str
    why_reorder: POWhyReorderDTO
    quantity_factors: POQuantityFactorsDTO
    policy_factors: POPolicyFactorsDTO
    supplier_factors: POSupplierFactorsDTO
    assumption_flags: POAssumptionFlagsDTO


class POSuggestionItemDTO(BaseModel):
    ingredient_id: int
    ingredient_name: str
    ingredient_supplier_id: Optional[int] = None
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    current_stock: float
    raw_quantity_needed: float
    quantity_to_order: float
    packs_to_order: int
    pack_size: float
    quantity_per_pack_item: float
    unit: str
    unit_price: float
    line_total: float
    lead_time_days: int
    min_order_quantity: float
    lead_demand: float
    shelf_demand: float
    explanation: Optional[POReorderExplanationDTO] = None


class POSuggestionGroupDTO(BaseModel):
    supplier_id: Optional[int] = None
    supplier_name: Optional[str] = None
    items: List[POSuggestionItemDTO]
    total_cost: float


class POSuggestionsResponseDTO(InventoryForecastStateDTO):
    suggestions: List[POSuggestionGroupDTO]
    all_items: List[POSuggestionItemDTO]
    last_eod_run_date: Optional[date] = None
    horizon_days: int


class CreatePOsFromSuggestionsRequestDTO(BaseModel):
    suggestions: List[POSuggestionItemDTO]
    notes: Optional[str] = None
# app/schemas/inventory_dto.py



class InventoryBase(BaseModel):
    restaurant_id: int
    ingredient_id: int
    supplier_id: Optional[int] = None
    quantity_on_hand: Optional[float] = 0
    min_stock_level: Optional[float] = 0
    last_delivery_date: Optional[date] = None
    spoilage_expected_date: Optional[date] = None
    shelf_life_days: Optional[int] = None
    spoilage_rate: Optional[float] = None
    last_audit_timestamp: Optional[datetime] = None
    last_audit_quantity: Optional[float] = 0
    unit: str  # Since it's mandatory, no Optional


class InventoryAdjustmentIn(BaseModel):
    inventory_id: int  # The inventory item to adjust
    lot_id: int  # The lot associated with the inventory item
    adjustment_quantity: Decimal  # The quantity to adjust (positive or negative)
    usage_type: str  # Type of usage (e.g., 'waste', 'manual_adjustment')
    reference_id: Optional[int] = (
        None  # Optional reference ID (could be tied to a sale, batch, etc.)
    )
    notes: Optional[str] = ""  # Optional notes to describe the adjustment


class InventorySetCurrentStockIn(BaseModel):
    inventory_id: int
    counted_quantity: Decimal
    lot_id: Optional[int] = None
    reason: Optional[str] = None
    notes: Optional[str] = ""


class InventoryAdjustmentResultDTO(BaseModel):
    success: bool
    message: str
    adjusted_quantity: float
    previous_quantity_on_hand: float
    current_quantity_on_hand: float
    resolved_deduction_alerts: int = 0


class InventoryLotIn(BaseModel):
    ingredient_supplier_id: int
    total_received: Union[float, int]
    delivery_date: date


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    quantity_on_hand: Optional[float] = None


class InventoryByCategoryItem(BaseModel):
    ingredient_name: str
    category: str
    quantity_on_hand: float
    spoilage_expected_date: Optional[datetime]
    supplier_name: Optional[str]


class Inventory(InventoryBase):
    inventory_id: int

class UsageLogDTO(BaseModel):
    usage_id: int
    used_quantity: float
    usage_type: str  # E.g. 'sale', 'waste', etc.
    used_date: str  # You can use datetime if needed
    reference_type: str
    reference_id: int
    notes: Optional[str] = None


class InventoryUsageDTO(BaseModel):
    inventory_id: int
    usage_logs: List[UsageLogDTO]

class LotBreakdownDTO(BaseModel):
    lot_id: int
    delivery_date: str
    quantity: float
    used_quantity: float
    wasted_quantity: float
    added_quantity: float
    remaining_quantity: float
    ingredient_supplier_id: Optional[int] = None
    supplier_unit: Optional[str] = None
    # Include other packaging info if necessary

class LotDTO(BaseModel):
    lot_id: int
    delivery_date: str  # You could also use `datetime.date` or `datetime` if your JSON uses ISO format
    quantity: float
    used_quantity: float
    wasted_quantity: float
    added_quantity: float
    remaining_quantity: float
    ingredient_supplier_id: Optional[int] = None
    supplier_unit: Optional[str] = None
    pack_size: Optional[float] = None
    quantity_per_pack_item: Optional[float] = None
    packages_received_total: Optional[int] = None
    approx_packages_remaining: Optional[float] = None

    

    model_config = ConfigDict(from_attributes=True)

class InventoryDTO(BaseModel):
    inventory_id: int
    ingredient_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    category: str
    ingredient_name: str
    unit: str
    quantity_on_hand: float
    packaging_breakdown: List[LotDTO]
class InventoryDetailsDTO(BaseModel):
    inventory_id: int
    ingredient_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    unit: str
    quantity_on_hand: float
    packaging_breakdown: List[LotDTO]

class IngredientOut(BaseModel):
    ingredient_supplier_id: int
    ingredient_id: int
    ingredient_name: str
    unit: str
    cost_per_unit: float
    lead_time_days: Optional[int]  # Could be null
    review_period_days: Optional[int] = None
    order_schedule_type: Optional[OrderScheduleType] = None
    allowed_order_days: Optional[List[WeekdayCode]] = None
    allowed_delivery_days: Optional[List[WeekdayCode]] = None
    cadence_source: Optional[CadenceSource] = None
    cadence_confidence_score: Optional[float] = None
    spoilage_rate: float
    shelf_life_days: Optional[int]  # Could be null
    preferred: bool
    min_order_quantity: Optional[int]
    supplier_priority: Optional[int]
    pack_size: Optional[str]  # Because pack_size might sometimes be None or a string
    quantity_per_pack_item: float
class StockMovementItem(BaseModel):
    date: str  # ISO date string
    type: str  # e.g. 'Purchase', 'Sale', 'Waste', 'Batch Production', 'Adjustment'
    ingredient_id: int
    ingredient_name: str
    quantity: float
    unit: str
    source_or_destination: Optional[str] = None
    lot_id: Optional[int] = None
    receipt_source: Optional[str] = None
    purchase_order_id: Optional[int] = None
    purchase_order_item_id: Optional[int] = None
    notes: Optional[str] = None
    running_balance: Optional[float] = None


class InventoryDeductionDiscrepancyDTO(BaseModel):
    alert_id: int
    alert_type: str
    message: str
    severity: str
    status: str
    is_acknowledged: bool
    date_created: str
    item_kind: Literal["ingredient", "batch", "unknown"]
    ingredient_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None
    required_quantity: float
    available_quantity: float
    current_quantity_on_hand: float
    shortfall_quantity: float
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    attempted_day: Optional[str] = None


class InventoryDiscrepancyHistoryItemDTO(BaseModel):
    discrepancy_id: int
    alert_id: Optional[int] = None
    event_type: Literal["deduction_blocked", "discrepancy_acknowledged", "discrepancy_resolved"]
    status: str
    is_acknowledged: bool
    severity: str
    item_kind: Literal["ingredient", "batch", "unknown"]
    ingredient_id: Optional[int] = None
    batch_recipe_id: Optional[int] = None
    item_name: Optional[str] = None
    unit: Optional[str] = None
    message: str
    required_quantity: float
    available_quantity: float
    current_quantity_on_hand: float
    shortfall_quantity: float
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    attempted_day: Optional[str] = None
    date_created: str
    date_resolved: Optional[str] = None
    last_updated: str

class SupplierOut(BaseModel):
    supplier_id: int
    name: str
    type: str
    region: str
    contact_info: Optional[str]
    rating: float
    website: Optional[str]
    is_active: bool
    supplier_feedback: Optional[str]
    contract_status: Optional[str]
    contract_start_date: Optional[str]
    contract_end_date: Optional[str]
    ingredients: List[IngredientOut]

    model_config = ConfigDict(from_attributes=True)