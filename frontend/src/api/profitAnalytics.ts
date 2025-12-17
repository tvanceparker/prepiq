import { api } from './index';
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
  const response = await api.get<IngredientCostTrendsResponse>(
    '/profit_analytics/ingredient_cost_trends',
    { params }
  );
  return response.data;
}
