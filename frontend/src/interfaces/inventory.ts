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
