import { api } from './index';
import { WasteAnalyticsResponse } from '../interfaces/analytics';

export interface WasteAnalyticsParams {
  start_date?: string;
  end_date?: string;
}

export async function getWasteAnalytics(
  params: WasteAnalyticsParams = {}
): Promise<WasteAnalyticsResponse> {
  const res = await api.get<WasteAnalyticsResponse>('/waste_analytics/summary', { params });
  return res.data;
}
