// src/api/pos.ts
import { post, get, put, del } from './index';
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
  // Cash Drawer
  CashDrawerSession,
  CashDrawerTransaction,
  CashDrawerTotals,
  CashDrawerSessionDetail,
  CashDrawerOpenRequest,
  CashDrawerCloseRequest,
  CashDrawerPayInOutRequest,
  CashDrawerNoSaleRequest,
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

export const simulateTerminalPayment = async (
  readerId: number,
  cardNumber: string = '4242424242424242'
): Promise<{ reader_id: number; simulated: boolean; status?: string }> => {
  return post<{ reader_id: number; simulated: boolean; status?: string }>(
    '/pos/terminal/payments/simulate',
    { reader_id: readerId, card_number: cardNumber }
  );
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
  simulatePayment: simulateTerminalPayment,
};
