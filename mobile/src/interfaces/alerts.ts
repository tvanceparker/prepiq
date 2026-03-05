// src/interfaces/alerts.ts

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertCategory = 'inventory' | 'forecast' | 'prep' | 'system' | 'order' | 'other';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

export interface Alert {
  alert_id: number;
  restaurant_id: number;
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  status: AlertStatus;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  acknowledged_by?: number;
  resolved_at?: string;
  resolved_by?: number;
}

export interface AlertCreate {
  title: string;
  message: string;
  severity: AlertSeverity;
  category: AlertCategory;
  metadata?: Record<string, any>;
}

export interface AlertUpdate {
  status?: AlertStatus;
  acknowledged_at?: string;
  acknowledged_by?: number;
  resolved_at?: string;
  resolved_by?: number;
}

export interface AlertsResponse {
  alerts: Alert[];
  total_count: number;
  unread_count: number;
}

export interface AlertsParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
  category?: AlertCategory;
  limit?: number;
  offset?: number;
}

export interface FixAlertPayload {
  quantity_sold?: number;
  sales_channel?: string;
  target_quantity_on_hand?: number;
  [key: string]: unknown;
}
