// src/api/alerts.js
import * as api from "./index.ts";

const ALERTS_BASE = "/alerts";

export async function fetchActiveAlerts(skip = 0, limit = 20) {
    return api.get(`${ALERTS_BASE}/active?skip=${skip}&limit=${limit}`);
}

export async function fetchAllAlerts(skip = 0, limit = 50) {
    return api.get(`${ALERTS_BASE}/get_all?skip=${skip}&limit=${limit}`);
}

export async function resolveAlert(alertId) {
    return api.post(`${ALERTS_BASE}/${alertId}/resolve`);
}

export async function acknowledgeAlert(alertId) {
    return api.post(`${ALERTS_BASE}/${alertId}/acknowledge`);
}

export async function fixAlert(alertId, fixData) {
    return api.post(`${ALERTS_BASE}/${alertId}/fix`, fixData);
}

export async function fetchActiveAlertCount() {
    const response = await api.get(`${ALERTS_BASE}/active_count`);
    return response; 
}
// If in future you want to create alerts from UI, you can add:
// export async function createAlert(alertData) {
//   return api.post(`${ALERTS_BASE}/create`, alertData);
// }
