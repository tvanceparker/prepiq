// src/interfaces/pos.ts

// =============================================================================
// Device Types
// =============================================================================

export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  deviceModel?: string;
  osVersion?: string;
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

export interface POSDevice {
  device_id: string;
  device_type: 'pos_terminal' | 'kitchen_display' | 'mobile';
  device_name: string;
  restaurant_id: number;
  is_active: boolean;
  last_seen: string;
  settings: Record<string, any>;
}

// =============================================================================
// Payment Types
// =============================================================================

export interface PaymentRequest {
  order_id: string;
  amount: number;
  currency: string;
  payment_method: 'card' | 'cash' | 'digital_wallet';
  tip_amount?: number;
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

// =============================================================================
// POS Mode & Integration Settings
// =============================================================================

export type POSMode = 'internal' | 'external';

export type POSProvider = 'square' | 'toast' | 'clover' | 'none' | null;

export interface POSModeSettings {
  pos_mode: POSMode;
  pos_provider: POSProvider;
  cash_drawer_enabled: boolean;
  stripe_terminal_location_id: string | null;
  has_terminal_readers: boolean;
}

export interface POSModeUpdateRequest {
  pos_mode: POSMode;
  pos_provider?: POSProvider;
  cash_drawer_enabled?: boolean;
}

export interface ExternalPOSStatus {
  provider: POSProvider;
  connected: boolean;
  merchant_id: string | null;
  last_sync: string | null;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  error_message?: string;
}

// =============================================================================
// Cash Drawer Types
// =============================================================================

export type CashDrawerTransactionType =
  | 'cash_sale'
  | 'card_sale'
  | 'cash_refund'
  | 'card_refund'
  | 'pay_in'
  | 'pay_out'
  | 'no_sale';

export type CashDrawerSessionStatus = 'open' | 'closed';

export interface CashDrawerSession {
  session_id: number;
  restaurant_id: number;
  device_id: number | null;
  opened_by_employee_id: number;
  closed_by_employee_id: number | null;
  opening_float: number;
  closing_float: number | null;
  expected_cash: number | null;
  actual_cash: number | null;
  variance: number | null;
  cash_sales_total: number;
  card_sales_total: number;
  tip_total: number;
  current_balance: number;
  status: CashDrawerSessionStatus;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

export interface CashDrawerTransaction {
  transaction_id: number;
  session_id: number;
  employee_id: number;
  transaction_type: CashDrawerTransactionType;
  amount: number;
  tip_amount: number;
  order_id: number | null;
  payment_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface CashDrawerTotals {
  opening_float: number;
  cash_sales: number;
  cash_refunds: number;
  card_sales: number;
  card_refunds: number;
  pay_ins: number;
  pay_outs: number;
  tips: number;
  expected_cash: number;
  net_cash?: number;
}

export interface CashDrawerSessionDetail {
  session: CashDrawerSession;
  totals: CashDrawerTotals;
  transaction_count: number;
}

export interface CashDrawerOpenRequest {
  opening_float: number;
  device_id?: number;
  notes?: string;
}

export interface CashDrawerCloseRequest {
  session_id: number;
  actual_cash: number;
  closing_float?: number;
  notes?: string;
}

export interface CashDrawerPayInOutRequest {
  session_id: number;
  amount: number;
  reason: string;
}

export interface CashDrawerNoSaleRequest {
  session_id: number;
  reason?: string;
}

// =============================================================================
// Stripe Terminal Types
// =============================================================================

export type TerminalReaderStatus = 'online' | 'offline';

export interface TerminalReader {
  reader_id: number;
  restaurant_id: number;
  stripe_reader_id: string;
  label: string;
  device_type: string;
  serial_number: string | null;
  status: TerminalReaderStatus;
  ip_address: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface TerminalLocation {
  location_id: string;
  display_name: string;
  address?: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

export interface TerminalLocationCreateRequest {
  display_name: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country?: string;
}

export interface TerminalReaderRegisterRequest {
  registration_code: string;
  label: string;
  device_type?: string;
}

export interface TerminalPaymentRequest {
  reader_id: number | string;
  amount: number;
  order_id?: number;
  currency?: string;
  description?: string;
  tip_eligible?: boolean;
  capture_method?: 'automatic' | 'manual';
}

export interface TerminalPaymentResponse {
  payment_intent_id: string;
  client_secret: string;
  status: string;
}

export interface TerminalProcessPaymentRequest {
  reader_id: number;
  payment_intent_id: string;
}

export interface TerminalProcessPaymentResponse {
  reader_id: number;
  stripe_reader_id: string;
  status: string;
  action: string | null;
  failure_reason?: string;
}

export interface TerminalRefundRequest {
  payment_intent_id: string;
  amount?: number;
  reason?: string;
}

export interface TerminalRefundResponse {
  refund_id: string;
  payment_intent_id: string;
  amount: number | null;
  status: string;
}

// =============================================================================
// Additional types for POS components
// =============================================================================

export type DeviceType = 'desktop' | 'mobile' | 'pos_terminal' | 'kitchen_display';

export interface MenuItemType {
  menu_item_id: number;
  name: string;
  price: number;
  category?: string | null;
  description?: string | null;
}

export interface CartItem extends MenuItemType {
  quantity: number;
  instructions?: string;
}
