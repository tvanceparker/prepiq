import { get, post, patch } from './index';

export const getUpcomingForecastTable = (startDate: string, endDate: string) =>
  get(`/sales_forecast/upcoming_forecast/table?start_date=${startDate}&end_date=${endDate}`);

export const getUpcomingForecastTotals = (startDate: string, endDate: string, mode = 'per_day') =>
  get(`/sales_forecast/upcoming_forecast/totals?start_date=${startDate}&end_date=${endDate}&mode=${mode}`);

export const getTopForecastedItems = (startDate: string, endDate: string, limit = 5) =>
  get(`/sales_forecast/upcoming_forecast/top_items?start_date=${startDate}&end_date=${endDate}&limit=${limit}`);

export const getForecastAccuracyChart = (startDate: string, endDate: string) =>
  get(`/sales_forecast/accuracy-chart?start_date=${startDate}&end_date=${endDate}`);

export const getForecastAccuracyTable = (startDate: string, endDate: string) =>
  get(`/sales_forecast/accuracy-table?start_date=${startDate}&end_date=${endDate}`);

export const getComputedForecastAccuracy = (startDate: string, endDate: string) =>
  get(`/sales_forecast/accuracy-computation?start_date=${startDate}&end_date=${endDate}`);

export const getSalesBreakdown = (startDate: string, endDate: string, byRevenue = false) =>
  get(`/sales_forecast/sales_breakdown?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesOverTime = (startDate: string, endDate: string, byRevenue = false) =>
  get(`/sales_forecast/sales_over_time?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getTopBottomItems = (startDate: string, endDate: string, byRevenue = false, top = true, count = 3) =>
  get(`/sales_forecast/top_bottom_items?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}&top=${top}&count=${count}`);

export const getSalesOverTimeByItem = (startDate: string, endDate: string, byRevenue = false) =>
  get(`/sales_forecast/patterns/sales_over_time_by_item?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesHeatmapData = (startDate: string, endDate: string, byRevenue = false, normalize = false) =>
  get(`/sales_forecast/patterns/heatmap_data?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}&normalize=${normalize}`);

export const getWeekdaySalesAvg = (startDate: string, endDate: string, byRevenue = false) =>
  get(`/sales_forecast/patterns/weekday_avg?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesChannelBreakdown = (startDate: string, endDate: string, byRevenue = false) =>
  get(`/sales_forecast/patterns/channel_breakdown?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesExplorerTable = (
  startDate: string,
  endDate: string,
  menuItemIds: Array<string | number> = [],
  salesChannels: string[] = []
) => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  menuItemIds.forEach((id) => params.append('menu_item_ids', id.toString()));
  salesChannels.forEach((channel) => params.append('sales_channels', channel));
  return get(`/sales_forecast/sales_explorer/table?${params.toString()}`);
};

export const downloadSalesExplorerExcel = async (
  startDate: string,
  endDate: string,
  menuItemIds: Array<string | number> = [],
  salesChannels: string[] = []
) => {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  menuItemIds.forEach((id) => params.append('menu_item_ids', id.toString()));
  salesChannels.forEach((channel) => params.append('sales_channels', channel));

  const res = await fetch(`${BASE_URL}/sales_forecast/sales_explorer/download_excel?${params.toString()}`, {
    method: 'GET',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to download Excel: ${res.status} ${err}`);
  }

  const contentDisposition = res.headers.get('Content-Disposition');
  let filename = 'sales_data.xlsx';
  if (contentDisposition?.includes('filename=')) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }

  const blob = await res.blob();
  return { blob, filename };
};

export const createSale = (saleData: any) => post('/sales_forecast/sales', saleData);
export const updateSale = (saleId: string | number, saleData: any) => patch(`/sales_forecast/sales/${saleId}`, saleData);
