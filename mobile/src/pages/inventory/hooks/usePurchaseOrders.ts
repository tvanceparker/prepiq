// src/pages/inventory/hooks/usePurchaseOrders.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  getPurchaseOrderDetail,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  addItemToPurchaseOrder,
  removeItemFromPurchaseOrder,
} from '../../../api/inventory';
import type {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderStatus,
  PurchaseOrderItem,
} from '../../../interfaces/inventory';

interface POSection {
  title: string;
  status: PurchaseOrderStatus;
  data: PurchaseOrder[];
}

interface UsePurchaseOrdersOptions {
  initialStatus?: PurchaseOrderStatus | 'all';
}

export function usePurchaseOrders(options: UsePurchaseOrdersOptions = {}) {
  const queryClient = useQueryClient();
  const { initialStatus = 'all' } = options;

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>(initialStatus);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Fetch purchase orders
  const ordersQuery = useQuery({
    queryKey: ['purchaseOrders', statusFilter !== 'all' ? statusFilter : undefined],
    queryFn: () =>
      getPurchaseOrders({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: PurchaseOrderCreate) => createPurchaseOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: PurchaseOrderStatus }) =>
      updatePurchaseOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });

  const purchaseOrders = ordersQuery.data ?? [];

  // Filter POs by search
  const filteredPOs = useMemo(() => {
    if (!searchQuery) return purchaseOrders;
    const query = searchQuery.toLowerCase();
    return purchaseOrders.filter(
      po =>
        po.order_id?.toString().includes(query) || po.supplier_name?.toLowerCase().includes(query)
    );
  }, [purchaseOrders, searchQuery]);

  // Group by status for sections
  const sections: POSection[] = useMemo(() => {
    const statusOrder: PurchaseOrderStatus[] = ['cart', 'pending', 'delivered', 'cancelled'];
    const grouped: Record<string, PurchaseOrder[]> = {};

    filteredPOs.forEach(po => {
      const status = po.status || 'pending';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(po);
    });

    return statusOrder
      .filter(status => grouped[status]?.length > 0)
      .map(status => ({
        title: status.charAt(0).toUpperCase() + status.slice(1),
        status,
        data: grouped[status],
      }));
  }, [filteredPOs]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: purchaseOrders.length };
    purchaseOrders.forEach(po => {
      const status = po.status || 'pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [purchaseOrders]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    setRefreshing(false);
  }, [queryClient]);

  // Status color helper
  const getStatusColor = useCallback((status: PurchaseOrderStatus): string => {
    switch (status) {
      case 'cart':
        return '#9e9e9e';
      case 'pending':
        return '#ff9800';
      case 'delivered':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }, []);

  // Handle status update
  const handleStatusUpdate = useCallback(
    async (poId: number, newStatus: PurchaseOrderStatus) => {
      await updateStatusMutation.mutateAsync({ orderId: poId, status: newStatus });
      setSelectedPO(null);
    },
    [updateStatusMutation]
  );

  // Select a PO
  const selectPO = useCallback((po: PurchaseOrder | null) => {
    setSelectedPO(po);
  }, []);

  // Close PO detail
  const closePODetail = useCallback(() => {
    setSelectedPO(null);
  }, []);

  return {
    // Data
    purchaseOrders: filteredPOs,
    allPurchaseOrders: purchaseOrders,
    sections,
    statusCounts,
    selectedPO,

    // Loading states
    loading: ordersQuery.isLoading,
    refreshing,
    creating: createMutation.isPending,
    updatingStatus: updateStatusMutation.isPending,

    // Filter state
    searchQuery,
    statusFilter,

    // Actions
    setSearchQuery,
    setStatusFilter,
    onRefresh,
    selectPO,
    closePODetail,
    handleStatusUpdate,
    createOrder: createMutation.mutateAsync,

    // Helpers
    getStatusColor,
  };
}

// Hook for single PO detail
export function usePurchaseOrderDetail(orderId: number | null) {
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['purchaseOrders', orderId],
    queryFn: () => getPurchaseOrderDetail(orderId!),
    enabled: orderId !== null,
  });

  const addItemMutation = useMutation({
    mutationFn: (item: Partial<PurchaseOrderItem>) => addItemToPurchaseOrder(orderId!, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', orderId] });
    },
  });

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
