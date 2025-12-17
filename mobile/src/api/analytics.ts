import client from './client';
import { CostGranularity, IngredientCostTrendsResponse } from '../interfaces/analytics';

export interface IngredientCostTrendsParams {
  start_date: string;
  end_date: string;
  granularity?: CostGranularity;
  ingredient_ids?: number[];
  supplier_ids?: number[];
}

export async function getIngredientCostTrends(
  params: IngredientCostTrendsParams
): Promise<IngredientCostTrendsResponse> {
  const res = await client.get<IngredientCostTrendsResponse>(
    '/profit_analytics/ingredient_cost_trends',
    { params }
  );
  return res.data;
}
