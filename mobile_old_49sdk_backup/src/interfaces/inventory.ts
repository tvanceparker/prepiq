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

export interface SupplierDTO {
  supplier_id: number;
  name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface IngredientSupplierDTO {
  ingredient_supplier_id: number;
  ingredient_id: number;
  supplier_id: number;
  package_size?: number;
  package_unit?: string;
  price_per_package?: number;
}

export interface InventoryAdjustmentDTO {
  adjustment_id: number;
  inventory_id: number;
  delta: number;
  reason?: string;
  created_at: string;
}
