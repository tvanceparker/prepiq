// src/hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getActiveOrders,
  getAllOrders,
  createOrder,
  updateOrderStatus,
  completeOrder,
  cancelOrder,
  getMenuItems,
} from '../api/orders';
import type { OrderCreate, Order, OrderStatus } from '../interfaces/orders';

export interface UseOrdersOptions {
  status?: string;
  autoRefresh?: boolean;
  refetchInterval?: number;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const queryClient = useQueryClient();
  const { status, autoRefresh = false, refetchInterval = 10000 } = options;

  // Fetch active orders
  const activeOrdersQuery = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: getActiveOrders,
    refetchInterval: autoRefresh ? refetchInterval : false,
  });

  // Fetch all orders with optional status filter
  const allOrdersQuery = useQuery({
    queryKey: ['orders', 'all', status],
    queryFn: () => getAllOrders({ status }),
    enabled: status !== undefined,
  });

  // Fetch menu items for order creation
  const menuItemsQuery = useQuery({
    queryKey: ['orders', 'menu'],
    queryFn: getMenuItems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (order: OrderCreate) => createOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: (orderId: number) => completeOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: (orderId: number) => cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  return {
    // Active orders
    activeOrders: activeOrdersQuery.data?.orders ?? [],
    activeOrdersLoading: activeOrdersQuery.isLoading,
    activeOrdersError: activeOrdersQuery.error,

    // All orders
    allOrders: allOrdersQuery.data?.orders ?? [],
    totalCount: allOrdersQuery.data?.total_count ?? 0,
    allOrdersLoading: allOrdersQuery.isLoading,
    allOrdersError: allOrdersQuery.error,

    // Menu items
    menuItems: menuItemsQuery.data ?? [],
    menuItemsLoading: menuItemsQuery.isLoading,

    // Mutations
    createOrder: createOrderMutation.mutateAsync,
    createOrderLoading: createOrderMutation.isPending,

    updateOrderStatus: updateStatusMutation.mutateAsync,
    updateStatusLoading: updateStatusMutation.isPending,

    completeOrder: completeOrderMutation.mutateAsync,
    cancelOrder: cancelOrderMutation.mutateAsync,

    // Utilities
    refreshOrders,
    isRefetching: activeOrdersQuery.isRefetching || allOrdersQuery.isRefetching,
  };
}

export default useOrders;
