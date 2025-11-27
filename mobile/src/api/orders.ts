// src/api/orders.ts
import { get, post, put } from './index';
import type {
  OrderCreate,
  OrderResponse,
  Order,
  OrderUpdate,
  MenuItem,
} from '../interfaces/orders';

export const createOrder = async (order: OrderCreate): Promise<OrderResponse> => {
  return post<OrderResponse>('/orders', order);
};

export const getOrder = async (orderId: number): Promise<Order> => {
  return get<Order>(`/orders/${orderId}`);
};

export const updateOrder = async (orderId: number, update: OrderUpdate): Promise<OrderResponse> => {
  return put<OrderResponse>(`/orders/${orderId}`, update);
};

export const updateOrderStatus = async (
  orderId: number,
  status: string
): Promise<OrderResponse> => {
  return put<OrderResponse>(`/orders/${orderId}/status`, { status });
};

export const getActiveOrders = async (): Promise<{ orders: Order[] }> => {
  return get<{ orders: Order[] }>('/orders?status=active');
};

export const getAllOrders = async (params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ orders: Order[]; total_count: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  const queryString = queryParams.toString();
  return get<{ orders: Order[]; total_count: number }>(
    `/orders${queryString ? `?${queryString}` : ''}`
  );
};

export const completeOrder = async (orderId: number): Promise<OrderResponse> => {
  return post<OrderResponse>(`/orders/${orderId}/complete`);
};

export const cancelOrder = async (orderId: number): Promise<OrderResponse> => {
  return put<OrderResponse>(`/orders/${orderId}/status`, { status: 'cancelled' });
};

export const getMenuItems = async (): Promise<MenuItem[]> => {
  return get<MenuItem[]>('/orders/menu');
};

export const getMenuItem = async (menuItemId: number): Promise<MenuItem> => {
  return get<MenuItem>(`/menu/items/${menuItemId}`);
};
