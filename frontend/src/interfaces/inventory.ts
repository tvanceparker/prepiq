// src/interfaces/inventory.ts

// --- Core Ingredient Types ---
export interface Ingredient {
  ingredient_id: number;
  name: string;
  category?: string;
  unit?: string;
  suppliers?: IngredientSupplier[];
  is_active?: boolean;
  current_stock?: number;
  reorder_point?: number;
  cost_per_unit?: number;
  // Add other ingredient properties as needed
}

export interface IngredientSupplier {
  ingredient_supplier_id?: number;
  ingredient_id: number;
  supplier_id: number;
  supplier_name?: string;
  ingredient_name?: string;
  ingredient_category?: string;
  category?: string;
  unit?: string;
  cost_per_unit: number;
  lead_time_days: number;
  spoilage_rate?: number;
  shelf_life_days?: number | null;
  preferred?: boolean;
  min_order_quantity?: number | null;
  supplier_priority?: number | null;
  pack_size?: number | null;
  quantity_per_pack_item?: number | null;
}

export interface IngredientListProps {
  ingredients: Ingredient[];
  filter: string;
  setFilter: (filter: string) => void;
  onSelect: (ingredient: Ingredient) => void;
  selectedId: number | null;
}

export interface IngredientSupplierDetailsProps {
  ingredientSuppliers: IngredientSupplier[];
  onEdit: (supplier: IngredientSupplier) => void;
  onDelete: (id: number) => void;
}

// --- Purchase Orders ---
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
  unit: string;
  unit_price: number;
  total_item_price: number;
}

export interface PurchaseOrder {
  order_id: number;
  restaurant_id: number;
  supplier_id: number;
  supplier_name: string;
  order_date: string;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  status: PurchaseOrderStatus;
  total_order_price: number;
  items: PurchaseOrderItem[];
  notes?: string | null;
}

export interface PurchaseOrderReceiptItemSummary {
  order_item_id: number;
  ingredient_id: number;
  lot_id: number;
  quantity_received: number;
  unit: string;
  receipt_status: 'received' | 'already_received';
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

export interface PurchaseOrderCreateItem {
  ingredient_id: number;
  ingredient_supplier_id?: number | null;
  quantity_ordered: number;
  unit: string;
  unit_price: number;
  notes?: string | null;
}

export interface PurchaseOrderCreate {
  supplier_id: number;
  expected_delivery_date?: string | null;
  items: PurchaseOrderCreateItem[];
  notes?: string | null;
}
// StockMovement interface for inventory stock movements
export interface StockMovement {
  date: string; // ISO date string
  type: string; // e.g. 'Purchase', 'Sale', 'Waste', 'Batch Production', 'Adjustment'
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

// --- Inventory Table Components ---
export interface LotBreakdown {
  lot_id: number;
  delivery_date: string;
  quantity: number;
  used_quantity: number;
  wasted_quantity: number;
  added_quantity: number;
  remaining_quantity: number;
  unit?: string | null;
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

export interface InventoryDiscrepancyHistoryItem {
  discrepancy_id: number;
  alert_id?: number | null;
  event_type: 'deduction_blocked' | 'discrepancy_acknowledged' | 'discrepancy_resolved';
  status: string;
  is_acknowledged: boolean;
  severity: string;
  item_kind: 'ingredient' | 'batch' | 'unknown';
  ingredient_id?: number | null;
  batch_recipe_id?: number | null;
  item_name?: string | null;
  unit?: string | null;
  message: string;
  required_quantity: number;
  available_quantity: number;
  current_quantity_on_hand: number;
  shortfall_quantity: number;
  reference_type?: string | null;
  reference_id?: number | null;
  attempted_day?: string | null;
  date_created: string;
  date_resolved?: string | null;
  last_updated: string;
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

// --- PO Suggestion Types ---
export interface POSuggestionItem {
  ingredient_id: number;
  ingredient_name: string;
  ingredient_supplier_id: number;
  supplier_id: number;
  supplier_name: string;
  current_stock: number;
  raw_quantity_needed: number;
  quantity_to_order: number; // The final quantity after pack rounding
  packs_to_order: number;
  pack_size: number;
  quantity_per_pack_item: number;
  unit: string;
  unit_price: number;
  line_total: number; // quantity_to_order * unit_price
  lead_time_days: number;
  min_order_quantity: number;
  lead_demand: number;
  shelf_demand: number;
}

export interface POSuggestionGroup {
  supplier_id: number;
  supplier_name: string;
  items: POSuggestionItem[];
  total_cost: number;
}

export interface POSuggestionsResponse {
  suggestions: POSuggestionGroup[];
  all_items: POSuggestionItem[];
  last_eod_run_date: string | null;
  forecast_source: 'cached' | 'fresh';
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
  unit_price: number; // cost_per_unit renamed for clarity
  pack_size: number;
  pack_unit: string; // The unit for pack_size
  quantity_per_pack_item: number;
  min_order_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
  supplier_priority: number;
}
