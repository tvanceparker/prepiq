import client from './client';
import {
  CostGranularity,
  IngredientCostTrendsResponse,
  DishProfitabilityResponse,
  WasteAnalyticsResponse,
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
  const res = await client.get<IngredientCostTrendsResponse>(
    '/profit_analytics/ingredient_cost_trends',
    { params }
  );
  return res.data;
}

export interface DishProfitabilityParams {
  start_date?: string;
  end_date?: string;
}

export async function getDishProfitability(
  params: DishProfitabilityParams = {}
): Promise<DishProfitabilityResponse> {
  const res = await client.get<DishProfitabilityResponse>(
    '/profit_analytics/dish_profitability',
    { params }
  );
  return res.data;
}

export interface WasteAnalyticsParams {
  start_date?: string;
  end_date?: string;
}

export async function getWasteAnalytics(
  params: WasteAnalyticsParams = {}
): Promise<WasteAnalyticsResponse> {
  const res = await client.get<WasteAnalyticsResponse>('/waste_analytics/summary', {
    params,
  });
  return res.data;
}
