// src/interfaces/inventory.ts

// --- Core Ingredient Types ---
export interface Ingredient {
  ingredient_id: number;
  name: string;
  category?: string;
  unit?: string;
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
  status: string;
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
