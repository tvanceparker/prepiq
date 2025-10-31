export interface InventoryAlert {
  ingredient_id: number;
  ingredient_name: string;
  current_quantity: number;
  unit: string;
  reorder_point: number;
  status: 'critical' | 'low' | 'warning';
}

export interface PrepTask {
  batch_recipe_id: number;
  batch_recipe_name: string;
  scheduled_quantity: number;
  completed_quantity: number;
  prep_date: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface MenuPerformance {
  menu_item_id: number;
  name: string;
  category: string | null;
  sales_today: number;
  revenue_today: number;
  forecast_today: number;
  variance: number;
}

export interface BatchRecipeSummary {
  total_batches: number;
  completed_today: number;
  pending_today: number;
  avg_completion_rate: number;
}

export interface InventorySummary {
  total_ingredients: number;
  critical_stock: number;
  low_stock: number;
  healthy_stock: number;
  total_value: number;
}

export interface ForecastedSalesBasic {
  forecasted_quantity: number;
  forecasted_revenue: number;
}

export interface TopForecastedItem {
  menu_item_id: number;
  name: string;
  forecasted_quantity: number;
}

export interface AccuracyBasic {
  accuracy_percent: number | null;
  note: string;
}

export interface DeliveryItem {
  ingredient_name: string;
  quantity_ordered: number;
  unit: string;
}

export interface ExpectedDelivery {
  order_id: number;
  supplier_name: string;
  expected_delivery_date: string;
  order_date: string;
  status: string;
  total_items: number;
  total_order_price: number;
  items: DeliveryItem[];
}

export interface ProDailyOverviewData {
  // Basic metrics
  forecasted_sales_today: ForecastedSalesBasic | null;
  top_5_items_today: TopForecastedItem[];
  accuracy_yesterday: AccuracyBasic | null;

  // Enhanced Pro metrics
  inventory_summary: InventorySummary;
  inventory_alerts: InventoryAlert[];
  prep_tasks_today: PrepTask[];
  batch_recipe_summary: BatchRecipeSummary;
  menu_performance_today: MenuPerformance[];
  expected_deliveries_today: ExpectedDelivery[];

  // Quick stats
  total_recipes: number;
  active_menu_items: number;
  staff_scheduled_today: number;
}
