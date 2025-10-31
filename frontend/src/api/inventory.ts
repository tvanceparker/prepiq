// --- Purchase Orders ---
import {
  StockMovement,
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderItem,
  IngredientName,
  PurchaseOrderStatus,
} from '../interfaces/inventory';
import { get, patch, post } from './index';
export async function createPurchaseOrder(data: PurchaseOrderCreate): Promise<any> {
  return post('/inventory/purchase_orders', data);
}

export async function getPurchaseOrders(params?: {
  status?: string;
  supplier_id?: number;
}): Promise<PurchaseOrder[]> {
  const search = new URLSearchParams();
  if (params?.status) search.append('status', params.status);
  if (params?.supplier_id) search.append('supplier_id', params.supplier_id.toString());
  return get(`/inventory/purchase_orders${search.toString() ? '?' + search.toString() : ''}`);
}

export async function getPurchaseOrderDetail(order_id: number): Promise<PurchaseOrder> {
  return get(`/inventory/purchase_orders/${order_id}`);
}

export async function updatePurchaseOrderStatus(
  order_id: number,
  status: PurchaseOrderStatus
): Promise<any> {
  return patch(
    `/inventory/purchase_orders/${order_id}/status?status=${encodeURIComponent(status)}`,
    {}
  );
}

export async function addItemToPurchaseOrder(
  order_id: number,
  item: Partial<PurchaseOrderItem>
): Promise<any> {
  return post(`/inventory/purchase_orders/${order_id}/items`, item);
}

export async function removeItemFromPurchaseOrder(
  order_id: number,
  order_item_id: number
): Promise<any> {
  return await fetch(`/inventory/purchase_orders/${order_id}/items/${order_item_id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  }).then(res => res.json());
}

// Stock Movements (TS)
export async function getStockMovements(
  startDate: string,
  endDate: string,
  ingredientId?: number
): Promise<StockMovement[]> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (ingredientId) params.append('ingredient_id', ingredientId.toString());
  return get(`/inventory/stock_movements?${params.toString()}`);
}

// Fetch all inventory (summary)
export const fetchAllInventory = async () => {
  return await get('/inventory/view');
};

// Fetch inventory details by ID
export const fetchInventoryDetails = async (inventoryId: number) => {
  return await get(`/inventory/details/${inventoryId}`);
};

// Get lot info (supplier, packaging, etc.)
export const fetchLotInfo = async (lotId: number) => {
  return await get(`/inventory/lot-info/${lotId}`);
};

// Get usage logs (used)
export const fetchUsedUsageLogs = async (lotId: number) => {
  return await get(`/inventory/used-usage-logs/${lotId}`);
};

// Get usage logs (wasted)
export const fetchWastedUsageLogs = async (lotId: number) => {
  return await get(`/inventory/wasted-usage-logs/${lotId}`);
};

// Fetch all suppliers
export const fetchAllSuppliers = async () => {
  return await get('/inventory/suppliers');
};

// Suppliers convenience (unwrap common {success, data, message} shape)
export const getSuppliersList = async (): Promise<any[]> => {
  const res = await fetchAllSuppliers();
  if (res && typeof res === 'object' && 'data' in res) return (res as any).data ?? [];
  return Array.isArray(res) ? res : [];
};

// Ingredient names for autocomplete
export const getIngredientNames = async (): Promise<IngredientName[]> => {
  return await get('/inventory/ingredient_names');
};

// Update supplier info (patch request with supplier_id and update data)
export const updateSupplier = async (supplierData: any) => {
  return await patch('/inventory/update-supplier', supplierData);
};

export const updateIngredientSupplier = async (ingredientSupplierData: any) => {
  return await patch('/inventory/update-ingredient-supplier', ingredientSupplierData);
};

export const createSupplier = async (supplierData: any) => {
  return await post('/inventory/create-supplier', supplierData);
};

export const createIngredientSupplier = async (
  supplier_id: number,
  ingredientSupplierData: any
) => {
  return await post(`/inventory/create-ingredient-supplier/${supplier_id}`, ingredientSupplierData);
};

// Inventory Adjustments
export const adjustInventory = async (adjustmentData: {
  inventory_id: number;
  lot_id: number;
  adjustment_quantity: number;
  usage_type: string;
  reference_id?: number;
  notes?: string;
}): Promise<any> => {
  return await post('/inventory/adjust-inventory', adjustmentData);
};

export const getInventoryAdjustments = async (): Promise<any[]> => {
  return await get('/inventory/adjustments');
};
