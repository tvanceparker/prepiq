// src/pages/pos/hooks/useOrders.ts
import { useState, useEffect } from 'react';
import { createOrder, getActiveOrders, updateOrderStatus, getMenuItems } from '../../../api/orders';
import {
  OrderCreate,
  OrderResponse,
  Order,
  ActiveOrdersResponse,
  MenuItem,
  MenuItemsResponse,
} from '../../../interfaces/orders';

export const useOrders = () => {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshOrders();
    refreshMenuItems();
  }, []);

  const refreshOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response: ActiveOrdersResponse = await getActiveOrders();
      setActiveOrders(response.orders);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMenuItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response: MenuItemsResponse = await getMenuItems();
      setMenuItems(response.items);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  };

  const createOrderHandler = async (order: OrderCreate): Promise<OrderResponse> => {
    try {
      setError(null);
      const response = await createOrder(order);
      await refreshOrders(); // Refresh orders after creating new one
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create order';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateOrderStatusHandler = async (
    orderId: number,
    status: string
  ): Promise<OrderResponse> => {
    try {
      setError(null);
      const response = await updateOrderStatus(orderId, status);

      // Update local state optimistically
      setActiveOrders(prevOrders =>
        prevOrders.map(order =>
          order.order_id === orderId ? { ...order, status: status as any } : order
        )
      );

      await refreshOrders(); // Refresh to get latest data
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update order status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    activeOrders,
    menuItems,
    isLoading,
    error,
    createOrder: createOrderHandler,
    updateOrderStatus: updateOrderStatusHandler,
    getActiveOrders: refreshOrders,
    getMenuItems: refreshMenuItems,
    refreshOrders,
    refreshMenuItems,
  };
};
