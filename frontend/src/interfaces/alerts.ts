export interface AlertCountResponse {
  count: number;
}

/**
 * Raw alert payload as returned by the backend. Fields are intentionally
 * flexible so downstream hooks can normalize as needed.
 */
export interface AlertDto {
  alert_id: number | string;
  alert_type: string;
  status?: string;
  severity?: string | number;
  title?: string;
  action_label?: string;
  description?: string;
  message?: string;
  created_at?: string;
  date_created?: string;
  is_acknowledged?: boolean;
  [key: string]: unknown;
}

export interface FixAlertPayload {
  quantity_sold?: number;
  sales_channel?: string;
  target_quantity_on_hand?: number;
  [key: string]: unknown;
}
