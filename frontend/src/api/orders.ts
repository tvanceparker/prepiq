// src/api/orders.ts
import { post, get, put } from './index';
import {
  OrderCreate,
  OrderResponse,
  Order,
  OrderUpdate,
  ActiveOrdersResponse,
  MenuItem,
  MenuItemsResponse,
} from '../interfaces/orders';

export const createOrder = async (order: OrderCreate): Promise<OrderResponse> => {
  return post<OrderResponse>('/api/v1/orders', order);
};

export const getOrder = async (orderId: number): Promise<Order> => {
  return get<Order>(`/api/v1/orders/${orderId}`);
};

export const updateOrder = async (orderId: number, update: OrderUpdate): Promise<OrderResponse> => {
  return put<OrderResponse>(`/api/v1/orders/${orderId}`, update);
};

export const updateOrderStatus = async (
  orderId: number,
  status: string
): Promise<OrderResponse> => {
  return put<OrderResponse>(`/api/v1/orders/${orderId}/status`, { status });
};

export const getActiveOrders = async (): Promise<ActiveOrdersResponse> => {
  return get<ActiveOrdersResponse>('/api/v1/orders/active');
};

export const completeOrder = async (orderId: number): Promise<OrderResponse> => {
  return post<OrderResponse>(`/api/v1/orders/${orderId}/complete`);
};

export const getMenuItems = async (): Promise<MenuItemsResponse> => {
  return get<MenuItemsResponse>('/api/v1/menu/items');
};

export const getMenuItem = async (menuItemId: number): Promise<MenuItem> => {
  return get<MenuItem>(`/api/v1/menu/items/${menuItemId}`);
};
