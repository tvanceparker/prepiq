// src/interfaces/orders.ts

export interface ModifierCreate {
  mod_type: string;
  reference_id?: number;
  quantity?: number;
  note?: string;
}

export interface OrderItemCreate {
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  instructions?: string;
  modifiers?: ModifierCreate[];
}

export interface OrderCreate {
  external_id?: string;
  sales_channel?: string;
  items: OrderItemCreate[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
}

export interface OrderResponse {
  order_id: number;
  status: string;
  message?: string;
}

export interface OrderItem {
  order_item_id: number;
  order_id: number;
  menu_item_id: number;
  name?: string; // Item name for display
  quantity: number;
  unit_price: number;
  instructions?: string;
  modifiers?: ModifierCreate[];
  created_at: string;
  updated_at: string;
}

export interface Order {
  order_id: number;
  external_id?: string;
  sales_channel?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | string;
  order_status?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface OrderUpdate {
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items?: OrderItemCreate[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
}

export interface ActiveOrdersResponse {
  orders: Order[];
  total_count?: number;
}

export interface MenuItem {
  menu_item_id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_active?: boolean;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItemsResponse {
  items: MenuItem[];
  total_count: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';
