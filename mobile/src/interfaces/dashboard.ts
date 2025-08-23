// Frontend interfaces mirroring backend Pydantic DTOs (app/schemas/dashboard_dto.py)
// Frontend interfaces mirroring backend Pydantic DTOs (app/schemas/dashboard_dto.py)
export interface MenuItemDTO {
  menu_item_id: number;
  name: string;
  category?: string | null;
  price: number;
  is_active: boolean;
}

export interface SalesEntryInDTO {
  menu_item_id: number;
  quantity_sold: number;
  sales_channel?: string | null;
}

export interface EodSalesEntriesInDTO {
  sale_date: string; // YYYY-MM-DD
  entries: SalesEntryInDTO[];
  overwrite?: boolean;
}

export interface SalesConflictOutDTO {
  sale_date: string;
  // conflicts map: channel -> count. The backend may use `null` for unspecified channel
  // serialized as the string 'null' in JSON keys; we model keys as strings here.
  conflicts: Record<string, number>;
}

export interface ForecastedSalesBasicDTO {
  forecasted_quantity: number;
  forecasted_revenue: number;
}

export interface TopForecastedItemDTO {
  menu_item_id: number;
  name: string;
  forecasted_quantity: number;
}

export interface AccuracyBasicOutDTO {
  accuracy_percent?: number | null;
  note: string;
}

export interface SaleOutDTO {
  sale_id: number;
  menu_item_id: number;
  quantity_sold: number;
  sales_channel?: string | null;
  sale_timestamp?: string | null;
}

export interface DailyOverviewDTO {
  forecasted_sales_today?: ForecastedSalesBasicDTO | null;
  top_5_items_today: TopForecastedItemDTO[];
  accuracy_yesterday?: AccuracyBasicOutDTO | null;
}

// Alerts UI interfaces (used by AlertsFeed components/hooks)
export interface AlertMeta {
  [key: string]: any;
}

export interface AlertItem {
  alert_id: number | string;
  alert_type: string;
  severity: string;
  message: string;
  employee_id?: number | null;
  role?: string | null;
  status?: string;
  is_acknowledged?: boolean;
  meta?: AlertMeta | null;
}

// no default export; import named interfaces where needed
