export interface AnalyticsSummary {
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  total_customers: number;
  wow_sales_change: number;
  wow_orders_change: number;
  wow_avg_change: number;
  wow_customers_change: number;
}

export interface DailySales {
  date: string;
  sales: number;
  orders: number;
  customers: number;
}

export interface ItemPerformance {
  name: string;
  units: number;
  revenue: number;
  trend: 'up' | 'down' | 'neutral';
  change: number;
}

export interface QuickAnalyticsData {
  summary: AnalyticsSummary;
  daily_sales: DailySales[];
  top_items: ItemPerformance[];
  bottom_items: ItemPerformance[];
  hourly_pattern: number[];
}
