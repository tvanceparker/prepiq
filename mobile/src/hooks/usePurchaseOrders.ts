// src/hooks/usePurchaseOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  addItemToPurchaseOrder,
  updatePurchaseOrderItem,
  removeItemFromPurchaseOrder,
  generatePOSuggestions,
  createPOsFromSuggestions,
  getIngredientsStockLevels,
  getIngredientSuppliers,
  getLastEodDate,
} from '../api/inventory';
import type {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderReceiptSummary,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  POSuggestionsResponse,
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../interfaces/inventory';

export interface UsePurchaseOrdersOptions {
  status?: PurchaseOrderStatus;
  supplierId?: number;
}

export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const queryClient = useQueryClient();
  const { status, supplierId } = options;

  // Fetch purchase orders with optional filters
  const ordersQuery = useQuery({
    queryKey: ['purchaseOrders', status, supplierId],
    queryFn: () => getPurchaseOrders({ status, supplier_id: supplierId }),
  });

  // Create PO mutation
  const createMutation = useMutation({
    mutationFn: (data: PurchaseOrderCreate) => createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: PurchaseOrderStatus }) => {
      if (status === 'delivered') {
        return receivePurchaseOrder(orderId);
      }
      return updatePurchaseOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({
      orderId,
      orderItemId,
      updates,
    }: {
      orderId: number;
      orderItemId: number;
      updates: Partial<PurchaseOrderItem>;
    }) => updatePurchaseOrderItem(orderId, orderItemId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ orderId, orderItemId }: { orderId: number; orderItemId: number }) =>
      removeItemFromPurchaseOrder(orderId, orderItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  // Group by status for tabs/filters
  const ordersByStatus = (ordersQuery.data ?? []).reduce(
    (acc, order) => {
      if (!acc[order.status]) acc[order.status] = [];
      acc[order.status].push(order);
      return acc;
    },
    {} as Record<PurchaseOrderStatus, PurchaseOrder[]>
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
  };

  const formatReceiptSummary = (summary: PurchaseOrderReceiptSummary): string => {
    if (summary.receipt_mode === 'already_received') {
      return `PO #${summary.order_id} was already received on ${summary.actual_delivery_date}.`;
    }
    if (summary.receipt_mode === 'resumed') {
      return `PO #${summary.order_id} resumed receipt: ${summary.newly_received_item_count} new, ${summary.already_received_item_count} already received.`;
    }
    return `PO #${summary.order_id} received: ${summary.newly_received_item_count} item(s).`;
  };

  return {
    orders: ordersQuery.data ?? [],
    ordersByStatus,
    loading: ordersQuery.isLoading,
    error: ordersQuery.error,
    isRefetching: ordersQuery.isRefetching,

    createOrder: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateItem: updateItemMutation.mutateAsync,
    updatingItem: updateItemMutation.isPending,

    removeItem: removeItemMutation.mutateAsync,
    removingItem: removeItemMutation.isPending,

    updateStatus: updateStatusMutation.mutateAsync,
    updatingStatus: updateStatusMutation.isPending,
    formatReceiptSummary,

    refresh,
  };
}

// Hook for a single purchase order detail
export function usePurchaseOrderDetail(orderId: number | null) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['purchaseOrders', orderId],
    queryFn: () => getPurchaseOrderDetail(orderId!),
    enabled: orderId !== null,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: (item: Partial<PurchaseOrderItem>) => addItemToPurchaseOrder(orderId!, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', orderId] });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (orderItemId: number) => removeItemFromPurchaseOrder(orderId!, orderItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', orderId] });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: (args: { orderItemId: number; updates: Partial<PurchaseOrderItem> }) =>
      updatePurchaseOrderItem(orderId!, args.orderItemId, args.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', orderId] });
    },
  });

  return {
    order: detailQuery.data,
    loading: detailQuery.isLoading,
    error: detailQuery.error,

    addItem: addItemMutation.mutateAsync,
    addingItem: addItemMutation.isPending,

    removeItem: removeItemMutation.mutateAsync,
    removingItem: removeItemMutation.isPending,

    updateItem: updateItemMutation.mutateAsync,
    updatingItem: updateItemMutation.isPending,
  };
}

// Hook for generating PO suggestions
export function usePOSuggestions() {
  const queryClient = useQueryClient();

  // Last EOD date query
  const lastEodQuery = useQuery({
    queryKey: ['lastEodDate'],
    queryFn: getLastEodDate,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Generate suggestions mutation
  const generateMutation = useMutation({
    mutationFn: ({
      horizonDays,
      useCachedForecast,
    }: {
      horizonDays: number;
      useCachedForecast: boolean;
    }) => generatePOSuggestions(horizonDays, useCachedForecast),
  });

  // Create POs from suggestions mutation
  const createFromSuggestionsMutation = useMutation({
    mutationFn: ({ suggestions, notes }: { suggestions: any[]; notes?: string }) =>
      createPOsFromSuggestions(suggestions, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  return {
    lastEodDate: lastEodQuery.data?.last_eod_run_date,
    loadingEodDate: lastEodQuery.isLoading,

    generateSuggestions: generateMutation.mutateAsync,
    generating: generateMutation.isPending,
    suggestions: generateMutation.data,
    generationError: generateMutation.error,

    createFromSuggestions: createFromSuggestionsMutation.mutateAsync,
    creating: createFromSuggestionsMutation.isPending,
    creationError: createFromSuggestionsMutation.error,

    reset: () => generateMutation.reset(),
  };
}

// Hook for ingredient stock levels
export function useIngredientStockLevels(enabled: boolean = true) {
  const stockLevelsQuery = useQuery({
    queryKey: ['ingredientStockLevels'],
    queryFn: getIngredientsStockLevels,
    enabled,
  });

  return {
    stockLevels: stockLevelsQuery.data ?? [],
    loading: stockLevelsQuery.isLoading,
    error: stockLevelsQuery.error,
    refetch: stockLevelsQuery.refetch,
  };
}

// Hook for ingredient suppliers
export function useIngredientSuppliers(ingredientId: number | null) {
  const suppliersQuery = useQuery({
    queryKey: ['ingredientSuppliers', ingredientId],
    queryFn: () => getIngredientSuppliers(ingredientId!),
    enabled: ingredientId !== null,
  });

  return {
    suppliers: suppliersQuery.data ?? [],
    loading: suppliersQuery.isLoading,
    error: suppliersQuery.error,
  };
}

export default usePurchaseOrders;
