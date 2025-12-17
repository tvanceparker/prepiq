// src/api/pos.ts
import { get, post, put, del } from './index';
import type {
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  DeviceSettingsResponse,
  DeviceSettingsUpdate,
  DeviceSettingsUpdateResponse,
  PaymentRequest,
  PaymentResponse,
  POSDevice,
  // Cash Drawer
  CashDrawerSession,
  CashDrawerTransaction,
  CashDrawerTotals,
  CashDrawerSessionDetail,
  CashDrawerOpenRequest,
  CashDrawerCloseRequest,
  CashDrawerPayInOutRequest,
  CashDrawerNoSaleRequest,
  CashDrawerSaleRequest,
  // Terminal
  TerminalReader,
  TerminalLocation,
  TerminalLocationCreateRequest,
  TerminalReaderRegisterRequest,
  TerminalPaymentRequest,
  TerminalPaymentResponse,
  TerminalProcessPaymentRequest,
  TerminalProcessPaymentResponse,
  TerminalRefundRequest,
  TerminalRefundResponse,
  // Settings
  POSModeSettings,
  POSModeUpdateRequest,
  MenuItemType,
} from '../interfaces/pos';

// =============================================================================
// Device Management
// =============================================================================

export const registerDevice = async (
  request: DeviceRegistrationRequest
): Promise<DeviceRegistrationResponse> => {
  return post<DeviceRegistrationResponse>('/pos/devices/register', request);
};

export const getDeviceSettings = async (deviceId: string): Promise<DeviceSettingsResponse> => {
  return get<DeviceSettingsResponse>(`/pos/devices/${deviceId}/settings`);
};

export const updateDeviceSettings = async (
  deviceId: string,
  settings: DeviceSettingsUpdate
): Promise<DeviceSettingsUpdateResponse> => {
  return put<DeviceSettingsUpdateResponse>(`/pos/devices/${deviceId}/settings`, settings);
};

type POSDeviceApiResponse = {
  device_id: number;
  device_name: string;
  device_type: string;
  last_seen?: string | null;
  device_settings?: Record<string, any>;
  is_active: boolean;
};

export const getDevices = async (): Promise<POSDevice[]> => {
  const response = await get<POSDeviceApiResponse[]>('/pos/devices');
  return response.map(device => ({
    device_id: device.device_id,
    device_type: device.device_type,
    device_name: device.device_name,
    restaurant_id: undefined,
    is_active: device.is_active,
    last_seen: device.last_seen || undefined,
    settings: device.device_settings || {},
  }));
};

// =============================================================================
// Payments
// =============================================================================

export const createPaymentIntent = async (request: PaymentRequest): Promise<PaymentResponse> => {
  return post<PaymentResponse>('/pos/payments/create-intent', request);
};

export const confirmPayment = async (
  paymentIdOrReq: string | { payment_intent_id: string }
): Promise<any> => {
  const body =
    typeof paymentIdOrReq === 'string' ? { payment_intent_id: paymentIdOrReq } : paymentIdOrReq;
  return post<any>('/pos/payments/confirm', body);
};

// =============================================================================
// Orders
// =============================================================================

export const sendOrderToKitchen = async (
  order: Record<string, any>
): Promise<{ success: boolean; message: string }> => {
  return post<{ success: boolean; message: string }>('/pos/orders/send', order);
};

export const createPOSOrder = async (
  order: any
): Promise<{ order_id: number; status: string; message?: string }> => {
  return post<{ order_id: number; status: string; message?: string }>('/pos/orders', order);
};

export const fetchMenuItems = async (): Promise<MenuItemType[]> => {
  return get<MenuItemType[]>('/orders/menu');
};

// =============================================================================
// POS Mode Settings
// =============================================================================

export const getPOSModeSettings = async (): Promise<POSModeSettings> => {
  return get<POSModeSettings>('/pos/settings/mode');
};

export const updatePOSModeSettings = async (
  request: POSModeUpdateRequest
): Promise<POSModeSettings> => {
  return put<POSModeSettings>('/pos/settings/mode', request);
};

// =============================================================================
// Cash Drawer API
// =============================================================================

export const openCashDrawer = async (
  request: CashDrawerOpenRequest
): Promise<CashDrawerSession> => {
  return post<CashDrawerSession>('/pos/cash-drawer/open', request);
};

export const closeCashDrawer = async (
  request: CashDrawerCloseRequest
): Promise<CashDrawerSession> => {
  return post<CashDrawerSession>('/pos/cash-drawer/close', request);
};

export const getCurrentDrawerSession = async (
  deviceId?: number
): Promise<CashDrawerSession | null> => {
  const params = deviceId ? `?device_id=${deviceId}` : '';
  return get<CashDrawerSession | null>(`/pos/cash-drawer/current${params}`);
};

export const getDrawerSessionDetails = async (
  sessionId: number
): Promise<CashDrawerSessionDetail> => {
  return get<CashDrawerSessionDetail>(`/pos/cash-drawer/${sessionId}`);
};

export const calculateExpectedCash = async (sessionId: number): Promise<CashDrawerTotals> => {
  return get<CashDrawerTotals>(`/pos/cash-drawer/${sessionId}/expected`);
};

export const cashDrawerPayIn = async (
  request: CashDrawerPayInOutRequest
): Promise<CashDrawerTransaction> => {
  return post<CashDrawerTransaction>('/pos/cash-drawer/pay-in', request);
};

export const cashDrawerPayOut = async (
  request: CashDrawerPayInOutRequest
): Promise<CashDrawerTransaction> => {
  return post<CashDrawerTransaction>('/pos/cash-drawer/pay-out', request);
};

export const cashDrawerNoSale = async (
  request: CashDrawerNoSaleRequest
): Promise<CashDrawerTransaction> => {
  return post<CashDrawerTransaction>('/pos/cash-drawer/no-sale', request);
};

export const cashDrawerRecordSale = async (
  request: CashDrawerSaleRequest
): Promise<CashDrawerTransaction> => {
  return post<CashDrawerTransaction>('/pos/cash-drawer/sale', request);
};

export const getDrawerSessionsForDate = async (
  targetDate: string
): Promise<{ sessions: CashDrawerSession[]; count: number }> => {
  return get<{ sessions: CashDrawerSession[]; count: number }>(
    `/pos/cash-drawer/sessions/date/${targetDate}`
  );
};

export const getDrawerDiscrepancies = async (
  threshold: number = 1.0
): Promise<{ sessions: CashDrawerSession[]; count: number }> => {
  return get<{ sessions: CashDrawerSession[]; count: number }>(
    `/pos/cash-drawer/sessions/discrepancies?threshold=${threshold}`
  );
};

// =============================================================================
// Stripe Terminal API
// =============================================================================

export const createTerminalLocation = async (
  request: TerminalLocationCreateRequest
): Promise<TerminalLocation> => {
  return post<TerminalLocation>('/pos/terminal/location', request);
};

export const getTerminalLocation = async (): Promise<TerminalLocation | null> => {
  return get<TerminalLocation | null>('/pos/terminal/location');
};

export const registerTerminalReader = async (
  request: TerminalReaderRegisterRequest
): Promise<TerminalReader> => {
  return post<TerminalReader>('/pos/terminal/readers/register', request);
};

export const listTerminalReaders = async (
  status?: 'online' | 'offline'
): Promise<{ readers: TerminalReader[]; total: number }> => {
  const params = status ? `?status=${status}` : '';
  return get<{ readers: TerminalReader[]; total: number }>(`/pos/terminal/readers${params}`);
};

export const getTerminalReader = async (readerId: number): Promise<TerminalReader> => {
  return get<TerminalReader>(`/pos/terminal/readers/${readerId}`);
};

export const syncTerminalReaderStatus = async (readerId: number): Promise<TerminalReader> => {
  return post<TerminalReader>(`/pos/terminal/readers/${readerId}/sync`, {});
};

export const deleteTerminalReader = async (
  readerId: number
): Promise<{ status: string; reader_id: number }> => {
  return del<{ status: string; reader_id: number }>(`/pos/terminal/readers/${readerId}`);
};

export const createTerminalPayment = async (
  request: TerminalPaymentRequest
): Promise<TerminalPaymentResponse> => {
  return post<TerminalPaymentResponse>('/pos/terminal/payments/create', request);
};

export const processTerminalPayment = async (
  request: TerminalProcessPaymentRequest
): Promise<TerminalProcessPaymentResponse> => {
  return post<TerminalProcessPaymentResponse>('/pos/terminal/payments/process', request);
};

export const cancelTerminalReaderAction = async (
  readerId: number
): Promise<{ reader_id: number; status: string }> => {
  return post<{ reader_id: number; status: string }>(
    `/pos/terminal/readers/${readerId}/cancel`,
    {}
  );
};

export const captureTerminalPayment = async (
  paymentIntentId: string
): Promise<{ payment_intent_id: string; status: string; amount_captured?: number }> => {
  return post<{ payment_intent_id: string; status: string; amount_captured?: number }>(
    '/pos/terminal/payments/capture',
    { payment_intent_id: paymentIntentId }
  );
};

export const refundTerminalPayment = async (
  request: TerminalRefundRequest
): Promise<TerminalRefundResponse> => {
  return post<TerminalRefundResponse>('/pos/terminal/payments/refund', request);
};

// =============================================================================
// Namespaced exports for cleaner imports
// =============================================================================

export const cashDrawer = {
  open: openCashDrawer,
  close: closeCashDrawer,
  getCurrentSession: getCurrentDrawerSession,
  getSessionDetails: getDrawerSessionDetails,
  calculateExpected: calculateExpectedCash,
  payin: cashDrawerPayIn,
  payout: cashDrawerPayOut,
  noSale: cashDrawerNoSale,
  recordSale: cashDrawerRecordSale,
  getSessionsForDate: getDrawerSessionsForDate,
  getDiscrepancies: getDrawerDiscrepancies,
};

export const terminal = {
  createLocation: createTerminalLocation,
  getLocation: getTerminalLocation,
  registerReader: registerTerminalReader,
  getReaders: async (status?: 'online' | 'offline') => {
    const result = await listTerminalReaders(status);
    return result.readers;
  },
  getReader: getTerminalReader,
  syncReaderStatus: syncTerminalReaderStatus,
  deleteReader: deleteTerminalReader,
  createPayment: createTerminalPayment,
  processPayment: processTerminalPayment,
  cancelReaderAction: cancelTerminalReaderAction,
  capturePayment: captureTerminalPayment,
  refundPayment: refundTerminalPayment,
};
