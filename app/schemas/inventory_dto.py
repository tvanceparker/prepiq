from pydantic import BaseModel
from pydantic import ConfigDict
from typing import Optional, List, Union, Literal
from datetime import date, datetime
from decimal import Decimal
class PurchaseOrderItemDTO(BaseModel):
    order_item_id: int
    order_id: int
    ingredient_id: int
    ingredient_name: str
    ingredient_supplier_id: Optional[int]
    quantity_ordered: float
    unit: str
    unit_price: float
    total_item_price: float

class PurchaseOrderCreateItemDTO(BaseModel):
    ingredient_id: int
    ingredient_supplier_id: Optional[int]
    quantity_ordered: float
    unit: str
    unit_price: float
    notes: Optional[str] = None

class PurchaseOrderCreateDTO(BaseModel):
    supplier_id: int
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


class PurchaseOrderReceiptItemSummaryDTO(BaseModel):
    order_item_id: int
    ingredient_id: int
    lot_id: int
    quantity_received: float
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
    supplier_id: int
    supplier_name: str
    order_date: date
    expected_delivery_date: Optional[date]
    actual_delivery_date: Optional[date]
    status: str
    total_order_price: float
    items: List[PurchaseOrderItemDTO]
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