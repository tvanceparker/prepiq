// src/interfaces/sales.ts
import type { AlertColor } from '@mui/material';

// --- Sales Data Types ---
export interface SaleRecord {
  sale_id?: number;
  menu_item: string;
  menu_item_name?: string;
  sale_date?: string;
  sale_timestamp: string;
  quantity_sold: number;
  sales_channel: string;
  revenue?: number;
}

export interface SalesPatternVisualizerData {
  menu_item_name: string;
  date: string;
  value: number;
}

export interface SalesPatternMatrixRow {
  menu_item_name: string;
  [date: string]: string | number; // date columns are dynamic
}

export interface SalesBreakdownData {
  name: string;
  metric: number;
  percent_of_total?: number;
}

export interface SalesPatternData {
  date: string;
  [menuItem: string]: string | number;
}

export interface SalesChannelData {
  sales_channel: string;
  quantity?: number;
  revenue?: number;
}

export interface ForecastData {
  forecast_id: number;
  forecast_date: string;
  menu_item_name: string;
  forecasted_quantity: number;
  forecasted_revenue?: number;
}

export interface ForecastTotals {
  forecasted_quantity: number;
  forecasted_revenue: number;
}

export interface ForecastTotalsPerDay {
  date: string;
  forecasted_quantity: number;
  forecasted_revenue: number;
}

export interface MenuItemSummary {
  name: string;
  quantity: number;
}

export interface AccuracyData {
  date: string;
  [menuItem: string]: string | number;
}

export interface MenuMixData {
  sale_date: string;
  menu_item_name: string;
  metric: number;
}

// --- Component Props ---
export interface SalesBreakdownChartProps {
  data: any[];
  breakdownType: 'channel' | 'item';
}

export interface SalesPatternsOverTimeChartProps {
  data: any[];
}

export interface SalesChannelBreakdownChartProps {
  data: any[];
}

export interface SalesPatternsVisualizerProps {
  data: any[];
}

export interface AccuracyChartProps {
  data: any[];
}

export interface BasicUpcomingForecastProps {
  // Add props as needed
}

export interface MenuMixInsightsBasicProps {
  // Add props as needed
}

export interface SalesExplorerBasicProps {
  // Add props as needed
}

export interface SalesExplorerTableProps {
  data: SaleRecord[];
  loading: boolean;
  updateSaleRecord: (saleId: number, saleData: any) => Promise<any>;
  menuItems?: string[];
  salesChannels?: string[];
}

export interface SalesPatternsBasicProps {
  // Add props as needed
}

export interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

// --- Form Data ---
export interface SaleFormData {
  menu_item: any;
  sale_timestamp: string;
  quantity_sold: number;
  sales_channel: string;
  revenue?: number;
}

// --- Chart Options Types ---
export type ChartLegendPosition = 'top' | 'right' | 'bottom' | 'left' | 'center' | 'chartArea';
export type ChartInteractionMode = 'point' | 'nearest' | 'index' | 'dataset' | 'x' | 'y';
