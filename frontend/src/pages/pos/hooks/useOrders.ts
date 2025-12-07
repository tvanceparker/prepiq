// src/pages/pos/hooks/useOrders.ts
import { useState, useEffect } from 'react';
import {
  createOrder,
  getActiveOrders,
  updateOrderStatus,
  getMenuItems,
  updateOrder,
} from '../../../api/orders';
import {
  OrderCreate,
  OrderResponse,
  Order,
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
      const response: any = await getActiveOrders();
      const normalized = Array.isArray(response)
        ? response
        : Array.isArray((response || {}).orders)
          ? (response as any).orders
          : Array.isArray((response || {}).data)
            ? (response as any).data
            : [];
      setActiveOrders(normalized || []);
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
      const response: MenuItemsResponse | any = await getMenuItems();
      // OrderService.get_menu_items returns a plain array of items.
      if (Array.isArray(response)) {
        setMenuItems(response as any);
      } else if (Array.isArray((response as any).items)) {
        setMenuItems((response as any).items);
      } else if (Array.isArray((response as any).data)) {
        setMenuItems((response as any).data);
      } else {
        setMenuItems([]);
      }
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
      // optimistic: if order_id returned, append a lightweight entry to activeOrders
      try {
        if (response?.order_id) {
          const lightweight = {
            order_id: response.order_id,
            status: 'pending',
            items: order.items as any,
            subtotal: order.subtotal,
            tax: order.tax || 0,
            discount: order.discount || 0,
            total: order.total,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any;
          setActiveOrders(prev => [lightweight, ...(prev || [])]);
        }
      } catch {}

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
      // Optimistic update; fallback to refresh
      setActiveOrders(prev =>
        (prev || []).map(o => (o.order_id === orderId ? { ...o, status: status as any } : o))
      );
      await refreshOrders();
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update order status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateOrderHandler = async (
    orderId: number,
    payload: Partial<Order>
  ): Promise<OrderResponse> => {
    try {
      setError(null);
      const response = await updateOrder(orderId, payload as any);
      await refreshOrders();
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update order';
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
    updateOrder: updateOrderHandler,
    getActiveOrders: refreshOrders,
    getMenuItems: refreshMenuItems,
    refreshOrders,
    refreshMenuItems,
  };
};
