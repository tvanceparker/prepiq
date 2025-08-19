import * as api from './index';

const ALERTS_BASE = '/alerts';

export async function fetchActiveAlerts(skip = 0, limit = 20) {
  return api.get(`${ALERTS_BASE}/active?skip=${skip}&limit=${limit}`);
}

export async function fetchAllAlerts(skip = 0, limit = 50) {
  return api.get(`${ALERTS_BASE}/get_all?skip=${skip}&limit=${limit}`);
}

export async function resolveAlert(alertId: string | number) {
  return api.post(`${ALERTS_BASE}/${alertId}/resolve`);
}

export async function acknowledgeAlert(alertId: string | number) {
  return api.post(`${ALERTS_BASE}/${alertId}/acknowledge`);
}

export async function fixAlert(alertId: string | number, fixData: any) {
  return api.post(`${ALERTS_BASE}/${alertId}/fix`, fixData);
}

export async function fetchActiveAlertCount() {
  return api.get(`${ALERTS_BASE}/active_count`);
}
