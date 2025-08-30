// src/api/orders.ts
import { post, get, put } from './index';
import { OrderCreate, OrderResponse, Order, OrderUpdate, MenuItem } from '../interfaces/orders';

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

export const getActiveOrders = async (): Promise<any> => {
  // backend returns an array of OrderDTO for GET /orders
  return get<any>('/orders?status=active');
};

export const completeOrder = async (orderId: number): Promise<OrderResponse> => {
  return post<OrderResponse>(`/orders/${orderId}/complete`);
};

export const getMenuItems = async (): Promise<MenuItem[]> => {
  // Use OrderService-backed menu for POS/basic tier: GET /orders/menu
  return get<MenuItem[]>('/orders/menu');
};

export const getMenuItem = async (menuItemId: number): Promise<MenuItem> => {
  return get<MenuItem>(`/menu/items/${menuItemId}`);
};
