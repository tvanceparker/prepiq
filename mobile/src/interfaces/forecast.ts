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

export interface SalesDateRange {
  min_date?: string | null;
  max_date?: string | null;
}

export interface MenuItemCostInsight {
  menu_item_id: number;
  menu_item_name: string;
  sales_channel: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  metric: number;
  percent_of_total: number;
}

export interface SalesOverTimeProItem {
  sale_date: string;
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  revenue: number;
  cost: number;
}

export interface TopBottomProItem {
  menu_item_id: number;
  menu_item_name: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  margin_percent: number;
}
