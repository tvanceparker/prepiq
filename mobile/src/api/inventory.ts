import { get, patch, post, del } from './index';
import type {
  InventoryItemDTO,
  SupplierDTO,
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderItem,
  PurchaseOrderReceiptSummary,
  PurchaseOrderStatus,
  StockMovement,
  IngredientName,
  POSuggestionsResponse,
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../interfaces/inventory';

// =============================================================================
// Inventory View
// =============================================================================

export const fetchAllInventory = async (): Promise<InventoryItemDTO[]> => {
  return get<InventoryItemDTO[]>('/inventory/view');
};

export const fetchInventoryDetails = async (inventoryId: string | number) =>
  get(`/inventory/details/${inventoryId}`);

export const fetchLotInfo = async (lotId: string | number) => get(`/inventory/lot-info/${lotId}`);

export const fetchUsedUsageLogs = async (lotId: string | number) =>
  get(`/inventory/used-usage-logs/${lotId}`);

export const fetchWastedUsageLogs = async (lotId: string | number) =>
  get(`/inventory/wasted-usage-logs/${lotId}`);

// =============================================================================
// Suppliers
// =============================================================================

interface SupplierResponse {
  success: boolean;
  data: SupplierDTO[];
  message: string;
}

export const fetchAllSuppliers = async (): Promise<SupplierDTO[]> => {
  const response = await get<SupplierResponse>('/inventory/suppliers');
  // Handle wrapped response { success, data, message }
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data ?? [];
  }
  // Fallback if response is already an array
  return Array.isArray(response) ? response : [];
};

export const getSuppliersList = async (): Promise<SupplierDTO[]> => {
  return fetchAllSuppliers();
};

export const createSupplier = async (supplierData: any) =>
  post('/inventory/create-supplier', supplierData);

export const updateSupplier = async (supplierData: any) =>
  patch('/inventory/update-supplier', supplierData);

export const deleteSupplier = async (supplierId: number) =>
  del(`/inventory/suppliers/${supplierId}`);

// =============================================================================
// Ingredient Suppliers
// =============================================================================

export const createIngredientSupplier = async (
  supplier_id: string | number,
  ingredientSupplierData: any
) => post(`/inventory/create-ingredient-supplier/${supplier_id}`, ingredientSupplierData);

export const updateIngredientSupplier = async (ingredientSupplierData: any) =>
  patch('/inventory/update-ingredient-supplier', ingredientSupplierData);

// =============================================================================
// Ingredient Names (for autocomplete)
// =============================================================================

export const getIngredientNames = async (): Promise<IngredientName[]> => {
  return get<IngredientName[]>('/inventory/ingredient_names');
};

// =============================================================================
// Inventory Adjustments
// =============================================================================

export const adjustInventory = async (adjustmentData: {
  inventory_id: number;
  lot_id: number;
  adjustment_quantity: number;
  usage_type: string;
  reference_id?: number;
  notes?: string;
}): Promise<any> => {
  return post('/inventory/adjust-inventory', adjustmentData);
};

export const getInventoryAdjustments = async (): Promise<any[]> => {
  return get<any[]>('/inventory/adjustments');
};

// =============================================================================
// Purchase Orders
// =============================================================================

export const createPurchaseOrder = async (data: PurchaseOrderCreate): Promise<PurchaseOrder> => {
  return post<PurchaseOrder>('/inventory/purchase_orders', data);
};

export const getPurchaseOrders = async (params?: {
  status?: string;
  supplier_id?: number;
}): Promise<PurchaseOrder[]> => {
  const search = new URLSearchParams();
  if (params?.status) search.append('status', params.status);
  if (params?.supplier_id) search.append('supplier_id', params.supplier_id.toString());
  const queryString = search.toString();
  return get<PurchaseOrder[]>(`/inventory/purchase_orders${queryString ? '?' + queryString : ''}`);
};

export const getPurchaseOrderDetail = async (order_id: number): Promise<PurchaseOrder> => {
  return get<PurchaseOrder>(`/inventory/purchase_orders/${order_id}`);
};

export const updatePurchaseOrderStatus = async (
  order_id: number,
  status: PurchaseOrderStatus
): Promise<any> => {
  return patch(
    `/inventory/purchase_orders/${order_id}/status?status=${encodeURIComponent(status)}`,
    {}
  );
};

export const receivePurchaseOrder = async (
  order_id: number,
  actual_delivery_date?: string
): Promise<PurchaseOrderReceiptSummary> => {
  return post(`/inventory/purchase_orders/${order_id}/receive`, {
    actual_delivery_date,
  });
};

export const addItemToPurchaseOrder = async (
  order_id: number,
  item: Partial<PurchaseOrderItem>
): Promise<any> => {
  return post(`/inventory/purchase_orders/${order_id}/items`, item);
};

export const removeItemFromPurchaseOrder = async (
  order_id: number,
  order_item_id: number
): Promise<void> => {
  return del(`/inventory/purchase_orders/${order_id}/items/${order_item_id}`);
};

export const updatePurchaseOrderItem = async (
  order_id: number,
  order_item_id: number,
  updates: Partial<PurchaseOrderItem>
): Promise<any> => {
  return patch(`/inventory/purchase_orders/${order_id}/items/${order_item_id}`, updates);
};

// =============================================================================
// PO Suggestion Generation
// =============================================================================

export const generatePOSuggestions = async (
  horizonDays: number = 7,
  useCachedForecast: boolean = true
): Promise<POSuggestionsResponse> => {
  const params = new URLSearchParams({
    horizon_days: horizonDays.toString(),
    use_cached_forecast: useCachedForecast.toString(),
  });
  return post<POSuggestionsResponse>(
    `/inventory/purchase_orders/generate-suggestions?${params.toString()}`,
    {}
  );
};

export const createPOsFromSuggestions = async (
  suggestions: any[],
  notes?: string
): Promise<any[]> => {
  return post<any[]>('/inventory/purchase_orders/create-from-suggestions', {
    suggestions,
    notes,
  });
};

// =============================================================================
// Ingredient Stock Levels & Suppliers
// =============================================================================

export const getIngredientsStockLevels = async (): Promise<IngredientStockLevel[]> => {
  return get<IngredientStockLevel[]>('/inventory/ingredients/stock-levels');
};

export const getIngredientSuppliers = async (
  ingredientId: number
): Promise<IngredientSupplierOption[]> => {
  return get<IngredientSupplierOption[]>(`/inventory/ingredients/${ingredientId}/suppliers`);
};

export const getLastEodDate = async (): Promise<{ last_eod_run_date: string | null }> => {
  return get<{ last_eod_run_date: string | null }>('/inventory/last-eod-date');
};

// =============================================================================
// Stock Movements
// =============================================================================

export const getStockMovements = async (
  startDate: string,
  endDate: string,
  ingredientId?: number
): Promise<StockMovement[]> => {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (ingredientId) params.append('ingredient_id', ingredientId.toString());
  return get<StockMovement[]>(`/inventory/stock_movements?${params.toString()}`);
};
