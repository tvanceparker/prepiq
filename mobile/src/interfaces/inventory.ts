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
