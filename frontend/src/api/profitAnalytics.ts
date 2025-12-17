import { api } from './index';
import {
  CostGranularity,
  IngredientCostTrendsResponse,
  DishProfitabilityResponse,
} from '../interfaces/analytics';

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

export interface DishProfitabilityParams {
  start_date?: string;
  end_date?: string;
}

export async function getDishProfitability(
  params: DishProfitabilityParams = {}
): Promise<DishProfitabilityResponse> {
  const response = await api.get<DishProfitabilityResponse>(
    '/profit_analytics/dish_profitability',
    { params }
  );
  return response.data;
}
