export type CostGranularity = 'daily' | 'weekly';

export interface IngredientCostTrendPoint {
  bucket_start: string;
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
