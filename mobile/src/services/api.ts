import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from '../constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Fallback to AsyncStorage
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh or logout
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      } catch {
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      }
      // Redirect to login - this would be handled by the auth store
    }
    return Promise.reject(error);
  }
);

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
    restaurant_id?: string;
    subscription_tier?: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    timezone: string;
    subscription_tier: string;
  };
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_phone?: string;
}

// Auth API functions
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<LoginResponse>> =>
    api.post(API_ENDPOINTS.LOGIN, data),

  register: (data: RegisterRequest): Promise<AxiosResponse<LoginResponse>> =>
    api.post(API_ENDPOINTS.REGISTER, data),

  logout: (): Promise<AxiosResponse> =>
    api.post(API_ENDPOINTS.LOGOUT),

  refreshToken: (refresh_token: string): Promise<AxiosResponse<LoginResponse>> =>
    api.post(API_ENDPOINTS.REFRESH, { refresh_token }),
};

// Dashboard API functions
export const dashboardAPI = {
  getDailyOverview: (): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.DAILY_OVERVIEW),

  getAlerts: (): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.ALERTS),
};

// Sales API functions
export const salesAPI = {
  getForecast: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.FORECAST, { params }),

  getSalesData: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.SALES_DATA, { params }),

  getSalesPatterns: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.SALES_PATTERNS, { params }),
};

// Inventory API functions
export const inventoryAPI = {
  getInventory: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.INVENTORY, { params }),

  getStockMovements: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.STOCK_MOVEMENTS, { params }),

  getSuppliers: (): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.SUPPLIERS),

  updateInventoryItem: (id: string, data: any): Promise<AxiosResponse<any>> =>
    api.put(`${API_ENDPOINTS.INVENTORY}/${id}`, data),
};

// Menu API functions
export const menuAPI = {
  getMenuItems: (): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.MENU_ITEMS),

  getRecipes: (): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.RECIPES),

  createMenuItem: (data: any): Promise<AxiosResponse<any>> =>
    api.post(API_ENDPOINTS.MENU_ITEMS, data),

  updateMenuItem: (id: string, data: any): Promise<AxiosResponse<any>> =>
    api.put(`${API_ENDPOINTS.MENU_ITEMS}/${id}`, data),
};

// Prep API functions
export const prepAPI = {
  getPrepSchedule: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.PREP_SCHEDULE, { params }),

  getPrepLogs: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.PREP_LOGS, { params }),

  updatePrepItem: (id: string, data: any): Promise<AxiosResponse<any>> =>
    api.put(`${API_ENDPOINTS.PREP_SCHEDULE}/${id}`, data),
};

// Team API functions
export const teamAPI = {
  getEmployees: (): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.EMPLOYEES),

  getClockEvents: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.CLOCK_EVENTS, { params }),

  getShifts: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.SHIFTS, { params }),

  clockIn: (employee_id: string): Promise<AxiosResponse<any>> =>
    api.post(`${API_ENDPOINTS.CLOCK_EVENTS}/clock-in`, { employee_id }),

  clockOut: (employee_id: string): Promise<AxiosResponse<any>> =>
    api.post(`${API_ENDPOINTS.CLOCK_EVENTS}/clock-out`, { employee_id }),
};

// Analytics API functions
export const analyticsAPI = {
  getAnalytics: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.ANALYTICS, { params }),

  getProfitability: (params?: any): Promise<AxiosResponse<any>> =>
    api.get(API_ENDPOINTS.PROFITABILITY, { params }),
};

export default api;