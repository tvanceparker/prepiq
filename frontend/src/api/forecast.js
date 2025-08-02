import { authFetch } from "../utils/authFetch";
import { BASE_URL } from "./config";


// src/api/salesForecast.js
import { get, post, patch } from "./index.ts"; // Import the generalized get method

// UPCOMING FORECAST BASIC
export const getUpcomingForecastTable = (startDate, endDate) =>
    get(`/sales_forecast/upcoming_forecast/table?start_date=${startDate}&end_date=${endDate}`);

export const getUpcomingForecastTotals = (startDate, endDate, mode = "per_day") =>
    get(`/sales_forecast/upcoming_forecast/totals?start_date=${startDate}&end_date=${endDate}&mode=${mode}`);

export const getTopForecastedItems = (startDate, endDate, limit = 5) =>
    get(`/sales_forecast/upcoming_forecast/top_items?start_date=${startDate}&end_date=${endDate}&limit=${limit}`);

// FORECAST ACCURACY
export const getForecastAccuracyChart = (startDate, endDate) =>
    get(`/sales_forecast/accuracy-chart?start_date=${startDate}&end_date=${endDate}`);

export const getForecastAccuracyTable = (startDate, endDate) =>
    get(`/sales_forecast/accuracy-table?start_date=${startDate}&end_date=${endDate}`);

export const getComputedForecastAccuracy = (startDate, endDate) =>
    get(`/sales_forecast/accuracy-computation?start_date=${startDate}&end_date=${endDate}`);

// MENU MIX BASIC
export const getSalesBreakdown = (startDate, endDate, byRevenue = false) =>
    get(`/sales_forecast/sales_breakdown?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesOverTime = (startDate, endDate, byRevenue = false) =>
    get(`/sales_forecast/sales_over_time?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getTopBottomItems = (startDate, endDate, byRevenue = false, top = true, count = 3) =>
    get(`/sales_forecast/top_bottom_items?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}&top=${top}&count=${count}`);

// SALES PATTERNS
export const getSalesOverTimeByItem = (startDate, endDate, byRevenue = false) =>
    get(`/sales_forecast/patterns/sales_over_time_by_item?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesHeatmapData = (startDate, endDate, byRevenue = false, normalize = false) =>
    get(`/sales_forecast/patterns/heatmap_data?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}&normalize=${normalize}`);


export const getWeekdaySalesAvg = (startDate, endDate, byRevenue = false) =>
    get(`/sales_forecast/patterns/weekday_avg?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesChannelBreakdown = (startDate, endDate, byRevenue = false) =>
    get(`/sales_forecast/patterns/channel_breakdown?start_date=${startDate}&end_date=${endDate}&by_revenue=${byRevenue}`);

export const getSalesExplorerTable = (
    startDate,
    endDate,
    menuItemIds = [],
    salesChannels = []
) => {
    const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
    });

    menuItemIds.forEach((id) => params.append("menu_item_ids", id.toString()));
    salesChannels.forEach((channel) => params.append("sales_channels", channel));

    return get(`/sales_forecast/sales_explorer/table?${params.toString()}`);
};

// ✅ Excel download (blob + authFetch)
export const downloadSalesExplorerExcel = async (
    startDate,
    endDate,
    menuItemIds = [],
    salesChannels = []
) => {
    const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
    });

    menuItemIds.forEach((id) => params.append("menu_item_ids", id));
    salesChannels.forEach((channel) => params.append("sales_channels", channel));

    const res = await authFetch(
        `${BASE_URL}/sales_forecast/sales_explorer/download_excel?${params.toString()}`,
        {
            method: "GET",
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Failed to download Excel: ${res.status} ${err}`);
    }

    const contentDisposition = res.headers.get("Content-Disposition");
    let filename = "sales_data.xlsx";

    if (contentDisposition?.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
            filename = match[1];
        }
    }

    const blob = await res.blob();

    return { blob, filename };
};

// Create a new sale
export const createSale = (saleData) => post("/sales_forecast/sales", saleData);

// Update an existing sale by ID
export const updateSale = (saleId, saleData) => patch(`/sales_forecast/sales/${saleId}`, saleData);
