export interface ForecastItemRow {
  menu_item_id: number;
  name: string;
  forecast_qty: number;
  unit?: string;
  forecast_date?: string;
}

export interface ForecastTotals {
  total_items: number;
  total_qty: number;
  start_date: string;
  end_date: string;
}

export interface SalesBreakdownEntry {
  label: string;
  value: number;
  revenue?: number;
}
