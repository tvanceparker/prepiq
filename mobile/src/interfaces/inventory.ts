// src/interfaces/inventory.ts

export interface InventoryLotDTO {
  lot_id: number;
  supplier_id?: number;
  quantity: number;
  unit: string;
  received_date?: string;
  expiration_date?: string | null;
  cost_per_unit?: number | null;
}

export interface InventoryItemDTO {
  inventory_id: number;
  name: string;
  category?: string;
  total_quantity: number;
  unit: string;
  lots?: InventoryLotDTO[];
}

export interface SupplierIngredient {
  ingredient_supplier_id: number;
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  cost_per_unit: number;
  lead_time_days?: number | null;
  spoilage_rate?: number | null;
  shelf_life_days?: number | null;
  preferred: boolean;
  min_order_quantity?: number | null;
  supplier_priority?: number | null;
  pack_size?: number | null;
  quantity_per_pack_item?: number | null;
}

export interface SupplierDTO {
  supplier_id: number;
  name: string;
  type?: string | null;
  region?: string | null;
  contact_info?: string | null;
  rating?: number | null;
  website?: string | null;
  is_active?: boolean;
  supplier_feedback?: string | null;
  contract_status?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  ingredients?: SupplierIngredient[];
  // Legacy fields for backwards compatibility
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface IngredientSupplierDTO {
  ingredient_supplier_id: number;
  ingredient_id: number;
  supplier_id: number;
  package_size?: number;
  package_unit?: string;
  price_per_package?: number;
  cost_per_unit?: number;
  lead_time_days?: number;
  preferred?: boolean;
}

export interface InventoryAdjustmentDTO {
  adjustment_id: number;
  inventory_id: number;
  delta: number;
  reason?: string;
  created_at: string;
}

export interface InventoryDeductionDiscrepancy {
  alert_id: number;
  alert_type: string;
  message: string;
  severity: string;
  status: string;
  is_acknowledged: boolean;
  date_created: string;
  item_kind: 'ingredient' | 'batch' | 'unknown';
  ingredient_id?: number | null;
  batch_recipe_id?: number | null;
  item_name?: string | null;
  unit?: string | null;
  required_quantity: number;
  available_quantity: number;
  current_quantity_on_hand: number;
  shortfall_quantity: number;
  reference_type?: string | null;
  reference_id?: number | null;
  attempted_day?: string | null;
}

export interface InventoryAdjustmentResult {
  success: boolean;
  message: string;
  adjusted_quantity: number;
  previous_quantity_on_hand: number;
  current_quantity_on_hand: number;
  resolved_deduction_alerts: number;
}

export interface InventorySetCurrentStockRequest {
  inventory_id: number;
  counted_quantity: number;
  lot_id?: number | null;
  reason?: string | null;
  notes?: string;
}

// =============================================================================
// Purchase Orders
// =============================================================================

export type PurchaseOrderStatus = 'cart' | 'pending' | 'delivered' | 'cancelled';

export interface IngredientName {
  ingredient_id: number;
  ingredient_name: string;
}

export interface PurchaseOrderItem {
  order_item_id: number;
  order_id: number;
  ingredient_id: number;
  ingredient_name: string;
  ingredient_supplier_id?: number | null;
  quantity_ordered: number;
  quantity_received?: number | null;
  variance_quantity?: number | null;
  variance_status?: 'matched' | 'short' | 'over' | null;
  unit: string;
  unit_price: number;
  total_item_price: number;
}

export interface PurchaseOrderReviewItem {
  ingredient_id: number;
  ingredient_name: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  quantity_to_order?: number | null;
  packs_to_order?: number | null;
  unit?: string | null;
  line_total?: number | null;
  lead_time_days?: number | null;
  lead_demand?: number | null;
  shelf_demand?: number | null;
  explanation?: POReorderExplanation | null;
}

export interface PurchaseOrderReviewContext {
  source_type: 'manual' | 'suggestion' | 'eod_auto';
  source_run_date?: string | null;
  explanation_items: PurchaseOrderReviewItem[];
}

export interface PurchaseOrder {
  order_id: number;
  restaurant_id: number;
  supplier_id?: number | null;
  supplier_name?: string | null;
  order_date: string;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  status: PurchaseOrderStatus;
  total_order_price: number;
  items: PurchaseOrderItem[];
  notes?: string | null;
  expected_delivery_stale?: boolean;
  expected_delivery_status_message?: string | null;
  review_context?: PurchaseOrderReviewContext | null;
}

export interface PurchaseOrderReceiptItemSummary {
  order_item_id: number;
  ingredient_id: number;
  lot_id: number;
  quantity_ordered: number;
  quantity_received: number;
  variance_quantity: number;
  variance_status: 'matched' | 'short' | 'over';
  unit: string;
  receipt_status: 'received' | 'already_received';
}

export interface PurchaseOrderReceiptItemInput {
  order_item_id: number;
  quantity_received: number;
}

export interface PurchaseOrderReceiptRequest {
  actual_delivery_date?: string | null;
  received_items?: PurchaseOrderReceiptItemInput[];
}

export interface PurchaseOrderReceiptSummary {
  order_id: number;
  status: 'delivered';
  actual_delivery_date: string;
  receipt_mode: 'received' | 'resumed' | 'already_received';
  requested_item_count: number;
  newly_received_item_count: number;
  already_received_item_count: number;
  received_items: PurchaseOrderReceiptItemSummary[];
}

export interface PurchaseOrderCreateResult {
  order_id: number;
  total_order_price: number;
  status: 'cart';
}

export interface PurchaseOrderStatusUpdateResult {
  order_id: number;
  status: string;
  expected_delivery_date?: string | null;
  expected_delivery_refreshed?: boolean;
}

export interface PurchaseOrderItemAddResult {
  order_item_id: number;
  order_total_price: number;
}

export interface PurchaseOrderItemUpdateResult {
  order_item_id: number;
  order_id: number;
  ingredient_id: number;
  ingredient_supplier_id?: number | null;
  quantity_ordered: number;
  unit: string;
  unit_price: number;
  total_item_price: number;
  order_total_price: number;
}

export interface PurchaseOrderItemDeleteResult {
  order_item_id: number;
  removed: boolean;
  order_total_price: number;
}

export interface LastEodDateResponse {
  last_eod_run_date: string | null;
}

export interface PurchaseOrderCreateItem {
  ingredient_id: number;
  ingredient_supplier_id?: number | null;
  quantity_ordered: number;
  unit: string;
  unit_price: number;
  notes?: string | null;
}

export interface PurchaseOrderCreate {
  supplier_id?: number | null;
  expected_delivery_date?: string | null;
  items: PurchaseOrderCreateItem[];
  notes?: string | null;
}

// =============================================================================
// Stock Movements
// =============================================================================

export interface StockMovement {
  date: string;
  type: string; // 'Purchase', 'Sale', 'Waste', 'Batch Production', 'Adjustment'
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
  source_or_destination?: string | null;
  lot_id?: number | null;
  receipt_source?: string | null;
  purchase_order_id?: number | null;
  purchase_order_item_id?: number | null;
  notes?: string | null;
  running_balance?: number | null;
}

// =============================================================================
// Inventory Table Components (for SectionList display)
// =============================================================================

export interface LotBreakdown {
  lot_id: number;
  delivery_date: string;
  quantity: number;
  unit?: string | null;
  used_quantity: number;
  wasted_quantity: number;
  added_quantity: number;
  remaining_quantity: number;
  ingredient_supplier_id?: number | null;
  supplier_unit?: string | null;
  pack_size?: number | null;
  quantity_per_pack_item?: number | null;
  packages_received_total?: number | null;
  approx_packages_remaining?: number | null;
}

export interface InventoryItem {
  inventory_id: number;
  ingredient_id?: number | null;
  batch_recipe_id?: number | null;
  category: string;
  ingredient_name: string;
  unit: string;
  quantity_on_hand: number;
  packaging_breakdown: LotBreakdown[];
}

export interface SupplierInfo {
  supplier_name: string;
  ingredient_supplier_id?: number | null;
  cost_per_unit?: number | null;
  total_packs?: number | null;
  pack_description?: string | null;
}

export interface LotInfo {
  lot_id: number;
  delivery_date: string;
  spoilage_expected_date?: string | null;
  received_quantity: number;
  status: string;
  supplier?: SupplierInfo | null;
}

export interface UsageLog {
  usage_id: number;
  used_date: string;
  used_quantity: number;
  unit: string;
  usage_type: string;
}

// =============================================================================
// PO Suggestion Types
// =============================================================================

export interface POReorderExplanation {
  summary: string;
  why_reorder: {
    current_stock: number | null;
    current_unit: string;
    reorder_point: number | null;
    lead_demand: number | null;
    shelf_demand: number | null;
    safety_stock: number | null;
    reorder_target: number | null;
  };
  quantity_factors: {
    raw_order_quantity: number | null;
    buffered_quantity: number | null;
    final_quantity_before_pack_rounding: number | null;
    converted_quantity_needed: number | null;
    pack_size: number;
    quantity_per_pack_item: number | null;
    quantity_per_pack: number | null;
    packs_to_order: number;
    total_quantity_ordered: number | null;
    inventory_unit: string | null;
    supplier_unit: string;
  };
  policy_factors: {
    service_level_z: number | null;
    abc_class: string;
    abc_multiplier: number | null;
    moq: number | null;
    moq_floor: number | null;
    max_allowed: number | null;
  };
  supplier_factors: {
    selected_supplier: string;
    selection_rule: string;
    preferred_supplier_available: boolean;
    selected_supplier_priority: number | null;
    selected_supplier_preferred: boolean;
    pricing_available: boolean;
  };
  assumption_flags: {
    inventory_source: string;
    lead_time_source: string;
    moq_source: string;
    shelf_life_source: string;
    unit_conversion_fallback: boolean;
    pricing_missing: boolean;
    abc_defaulted: boolean;
  };
}

export interface POSuggestionItem {
  ingredient_id: number;
  ingredient_name: string;
  ingredient_supplier_id?: number | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  current_stock: number;
  raw_quantity_needed: number;
  quantity_to_order: number;
  packs_to_order: number;
  pack_size: number;
  quantity_per_pack_item: number;
  unit: string;
  unit_price: number;
  line_total: number;
  lead_time_days: number;
  min_order_quantity: number;
  lead_demand: number;
  shelf_demand: number;
  explanation?: POReorderExplanation;
}

export interface POSuggestionGroup {
  supplier_id?: number | null;
  supplier_name?: string | null;
  items: POSuggestionItem[];
  total_cost: number;
}

export interface POSuggestionsResponse {
  suggestions: POSuggestionGroup[];
  all_items: POSuggestionItem[];
  last_eod_run_date: string | null;
  forecast_source: 'cached' | 'fresh';
  forecast_source_type: 'eod' | 'on_demand';
  forecast_generated_at: string | null;
  forecast_reused: boolean;
  forecast_stale: boolean;
  forecast_status: 'ready' | 'stale' | 'degraded' | 'failed';
  forecast_status_message: string | null;
  forecast_authority: 'finalized_eod' | 'on_demand_preview' | 'unavailable';
  forecast_usage_action: 'allow' | 'review' | 'block';
  forecast_usage_message: string | null;
  forecast_confidence_score?: number | null;
  forecast_version?: number | null;
  horizon_days: number;
}

export interface IngredientStockLevel {
  ingredient_id: number;
  ingredient_name: string;
  current_stock: number;
  unit: string;
  reorder_point: number;
  status: 'critical' | 'low' | 'warning' | 'ok';
  supplier_count: number;
  abc_class: string;
}

export interface IngredientSupplierOption {
  ingredient_supplier_id: number;
  supplier_id: number;
  supplier_name: string;
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  unit_price: number;
  pack_size: number;
  pack_unit: string;
  quantity_per_pack_item: number;
  min_order_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  supplier_priority: number;
}
