// src/interfaces/pos.ts

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  plugins: string[];
  canvasFingerprint: string;
  webglFingerprint: string;
}

export interface DeviceRegistrationRequest {
  device_type: 'pos_terminal' | 'kitchen_display' | 'mobile';
  device_name: string;
  fingerprint: DeviceFingerprint;
}

export interface DeviceRegistrationResponse {
  device_id: string;
  device_token: string;
  expires_at: string;
  restaurant_id: number;
  device_type: string;
  device_name: string;
}

export interface DeviceSettings {
  device_id: string;
  restaurant_id: number;
  device_type: string;
  device_name: string;
  settings: Record<string, any>;
  last_updated: string;
}

export interface DeviceSettingsResponse {
  device_id: string;
  restaurant_id: number;
  device_type: string;
  device_name: string;
  settings: Record<string, any>;
  last_updated: string;
}

export interface DeviceSettingsUpdate {
  device_name?: string;
  settings?: Record<string, any>;
}

export interface PaymentRequest {
  order_id: string;
  amount: number;
  currency: string;
  payment_method: 'card' | 'cash' | 'digital_wallet';
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  payment_id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceTokenRequest {
  device_id: string;
  fingerprint: DeviceFingerprint;
}

export interface DeviceTokenResponse {
  device_token: string;
  expires_at: string;
  restaurant_id: number;
}

export interface POSDevice {
  device_id: string;
  device_type: 'pos_terminal' | 'kitchen_display' | 'mobile';
  device_name: string;
  restaurant_id: number;
  is_active: boolean;
  last_seen: string;
  settings: Record<string, any>;
}

export interface POSContextType {
  device: POSDevice | null;
  deviceToken: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  registerDevice: (request: DeviceRegistrationRequest) => Promise<DeviceRegistrationResponse>;
  refreshToken: () => Promise<DeviceTokenResponse>;
  updateSettings: (settings: DeviceSettingsUpdate) => Promise<DeviceSettingsResponse>;
  logout: () => void;
}
