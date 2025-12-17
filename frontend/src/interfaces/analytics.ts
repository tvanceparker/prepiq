export type CostGranularity = 'daily' | 'weekly';

export interface IngredientCostTrendPoint {
  bucket_start: string; // ISO date string
  total_cost: number;
  total_quantity?: number | null;
  avg_unit_price?: number | null;
}

export interface IngredientCostTrendSeries {
  ingredient_id: number;
  ingredient_name: string;
  supplier_id?: number | null;
  supplier_name?: string | null;
  unit?: string | null;
  points: IngredientCostTrendPoint[];
  total_cost: number;
  total_quantity?: number | null;
  avg_unit_price?: number | null;
}

export interface IngredientCostTrendsResponse {
  granularity: CostGranularity;
  start_date: string;
  end_date: string;
  total_cost: number;
  series: IngredientCostTrendSeries[];
}

export interface DishProfitabilityItem {
  menu_item_id: number;
  name: string;
  category?: string | null;
  price: number;
  ingredient_cost: number;
  batch_cost: number;
  total_food_cost: number;
  gross_margin: number;
  food_cost_pct: number;
  sales_count?: number | null;
  revenue?: number | null;
  contribution_pct?: number | null;
}

export interface DishProfitabilityResponse {
  start_date?: string | null;
  end_date?: string | null;
  average_margin: number;
  average_food_cost_pct: number;
  total_items: number;
  items: DishProfitabilityItem[];
}

export interface WasteTrendPoint {
  bucket_start: string;
  total_quantity: number;
  total_cost: number;
}

export interface WasteBreakdownItem {
  key: string;
  label: string;
  total_quantity: number;
  total_cost: number;
  usage_type?: string | null;
  reason?: string | null;
}

export interface WasteInsight {
  title: string;
  detail: string;
  action?: string;
  severity: string;
}

export interface WasteAnalyticsResponse {
  start_date?: string | null;
  end_date?: string | null;
  total_waste_quantity: number;
  total_waste_cost: number;
  average_daily_cost: number;
  trend: WasteTrendPoint[];
  by_type: WasteBreakdownItem[];
  top_ingredients: WasteBreakdownItem[];
  top_reasons: WasteBreakdownItem[];
  insights: WasteInsight[];
}
