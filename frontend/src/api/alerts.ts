import { get, post } from './index';
import type { AlertDto, AlertCountResponse, FixAlertPayload } from '../interfaces/alerts';

const ALERTS_BASE = '/alerts';

export const fetchActiveAlerts = async (skip = 0, limit = 20): Promise<AlertDto[]> => {
  return get<AlertDto[]>(`${ALERTS_BASE}/active?skip=${skip}&limit=${limit}`);
};

export const fetchAllAlerts = async (skip = 0, limit = 50): Promise<AlertDto[]> => {
  return get<AlertDto[]>(`${ALERTS_BASE}/get_all?skip=${skip}&limit=${limit}`);
};

export const resolveAlert = async (alertId: number | string): Promise<AlertDto> => {
  return post<AlertDto>(`${ALERTS_BASE}/${alertId}/resolve`);
};

export const acknowledgeAlert = async (alertId: number | string): Promise<AlertDto> => {
  return post<AlertDto>(`${ALERTS_BASE}/${alertId}/acknowledge`);
};

export const fixAlert = async (
  alertId: number | string,
  fixData: FixAlertPayload
): Promise<void> => {
  await post(`${ALERTS_BASE}/${alertId}/fix`, fixData);
};

export const fetchActiveAlertCount = async (): Promise<AlertCountResponse> => {
  return get<AlertCountResponse>(`${ALERTS_BASE}/active_count`);
};
