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

export const registerDevice = async (
  request: DeviceRegistrationRequest
): Promise<DeviceRegistrationResponse> => {
  return post<DeviceRegistrationResponse>('/api/v1/pos/register-device', request);
};

export const refreshDeviceToken = async (
  request: DeviceTokenRequest
): Promise<DeviceTokenResponse> => {
  return post<DeviceTokenResponse>('/api/v1/pos/refresh-token', request);
};

export const getDeviceSettings = async (deviceId: string): Promise<DeviceSettingsResponse> => {
  return get<DeviceSettingsResponse>(`/api/v1/pos/device/${deviceId}/settings`);
};

export const updateDeviceSettings = async (
  deviceId: string,
  settings: DeviceSettingsUpdate
): Promise<DeviceSettingsResponse> => {
  return put<DeviceSettingsResponse>(`/api/v1/pos/device/${deviceId}/settings`, settings);
};

export const createPaymentIntent = async (request: PaymentRequest): Promise<PaymentResponse> => {
  return post<PaymentResponse>('/api/v1/pos/payment-intent', request);
};

export const confirmPayment = async (paymentId: string): Promise<PaymentResponse> => {
  return post<PaymentResponse>(`/api/v1/pos/payment/${paymentId}/confirm`);
};

export const getDevices = async (): Promise<POSDevice[]> => {
  return get<POSDevice[]>('/api/v1/pos/devices');
};

export const sendOrderToKitchen = async (
  orderId: number
): Promise<{ success: boolean; message: string }> => {
  return post<{ success: boolean; message: string }>(
    `/api/v1/pos/order/${orderId}/send-to-kitchen`
  );
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
