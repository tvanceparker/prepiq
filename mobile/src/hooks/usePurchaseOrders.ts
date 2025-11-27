// src/hooks/usePurchaseOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  addItemToPurchaseOrder,
  removeItemFromPurchaseOrder,
} from '../api/inventory';
import type {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderStatus,
  PurchaseOrderItem,
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
    mutationFn: ({ orderId, status }: { orderId: number; status: PurchaseOrderStatus }) =>
      updatePurchaseOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  // Group by status for tabs/filters
  const ordersByStatus = (ordersQuery.data ?? []).reduce((acc, order) => {
    if (!acc[order.status]) acc[order.status] = [];
    acc[order.status].push(order);
    return acc;
  }, {} as Record<PurchaseOrderStatus, PurchaseOrder[]>);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
  };

  return {
    orders: ordersQuery.data ?? [],
    ordersByStatus,
    loading: ordersQuery.isLoading,
    error: ordersQuery.error,
    isRefetching: ordersQuery.isRefetching,

    createOrder: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateStatus: updateStatusMutation.mutateAsync,
    updatingStatus: updateStatusMutation.isPending,

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

  return {
    order: detailQuery.data,
    loading: detailQuery.isLoading,
    error: detailQuery.error,

    addItem: addItemMutation.mutateAsync,
    addingItem: addItemMutation.isPending,

    removeItem: removeItemMutation.mutateAsync,
    removingItem: removeItemMutation.isPending,
  };
}

export default usePurchaseOrders;
