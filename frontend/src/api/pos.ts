// src/api/pos.ts
import { post, get, put } from './index';
import {
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  DeviceSettingsResponse,
  DeviceSettingsUpdate,
  PaymentRequest,
  PaymentResponse,
  DeviceTokenRequest,
  DeviceTokenResponse,
  POSDevice,
} from '../interfaces/pos';
import { MenuItemType } from '../interfaces/pos';

export const registerDevice = async (
  request: DeviceRegistrationRequest
): Promise<DeviceRegistrationResponse> => {
  // Backend route: POST /api/v1/pos/devices/register (see app/api/v1/pos_routes.py)
  return post<DeviceRegistrationResponse>('/pos/devices/register', request);
};

export const refreshDeviceToken = async (
  request: DeviceTokenRequest
): Promise<DeviceTokenResponse> => {
  // NOTE: no refresh-token route is defined in app/api/v1/pos_routes.py attachment.
  // Keep this here if another backend route exists; otherwise callers should be updated.
  return post<DeviceTokenResponse>('/pos/refresh-token', request);
};

export const getDeviceSettings = async (deviceId: string): Promise<DeviceSettingsResponse> => {
  // Backend route: GET /api/v1/pos/devices/{device_id}/settings
  return get<DeviceSettingsResponse>(`/pos/devices/${deviceId}/settings`);
};

export const updateDeviceSettings = async (
  deviceId: string,
  settings: DeviceSettingsUpdate
): Promise<DeviceSettingsResponse> => {
  // Backend route: PUT /api/v1/pos/devices/{device_id}/settings
  return put<DeviceSettingsResponse>(`/pos/devices/${deviceId}/settings`, settings);
};

// Backend route: POST /api/v1/pos/payments/create-intent
export const createPaymentIntent = async (request: PaymentRequest): Promise<PaymentResponse> => {
  return post<PaymentResponse>('/pos/payments/create-intent', request);
};

// Backend route: POST /api/v1/pos/payments/confirm
// The backend expects a PaymentConfirmRequest object; pass the appropriate shape here.
export const confirmPayment = async (
  paymentIdOrReq: string | { payment_intent_id: string }
): Promise<any> => {
  const body =
    typeof paymentIdOrReq === 'string' ? { payment_intent_id: paymentIdOrReq } : paymentIdOrReq;
  return post<any>('/pos/payments/confirm', body);
};

export const getDevices = async (): Promise<POSDevice[]> => {
  // NOTE: a list-devices endpoint wasn't present in the provided pos_routes.py attachment.
  // If the backend implements this elsewhere, keep it; otherwise update callers.
  return get<POSDevice[]>('/pos/devices');
};

// Backend route: POST /api/v1/pos/orders/send
// Backend expects the order payload in the request body (see pos_routes.py).
export const sendOrderToKitchen = async (
  order: Record<string, any>
): Promise<{ success: boolean; message: string }> => {
  return post<{ success: boolean; message: string }>(`/pos/orders/send`, order);
};

// New: create order (persistent) - POST /api/v1/pos/orders
export const createOrder = async (
  order: any
): Promise<{ order_id: number; status: string; message?: string }> => {
  return post<{ order_id: number; status: string; message?: string }>(`/pos/orders`, order);
};

// Fetch menu items
export const fetchMenuItems = async (): Promise<MenuItemType[]> => {
  // Use OrderService-backed menu for POS/basic tier
  return get<MenuItemType[]>('/orders/menu');
};

// Utility function to generate device fingerprint
export const generateDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 10, 10);
  const canvasFingerprint = canvas.toDataURL();

  const gl = document.createElement('canvas').getContext('webgl');
  const webglFingerprint = gl ? gl.getParameter(gl.RENDERER) + gl.getParameter(gl.VENDOR) : '';

  return {
    userAgent: navigator.userAgent,
    screenResolution: `${(window as any).screen?.width || 0}x${(window as any).screen?.height || 0}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    plugins: Array.from(navigator.plugins).map(p => p.name),
    canvasFingerprint,
    webglFingerprint,
  };
};
