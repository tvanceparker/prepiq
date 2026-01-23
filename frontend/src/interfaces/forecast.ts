/**
 * Sales & Forecasting Interfaces
 * Aligned with backend: app/schemas/sales_forecast_dto.py
 */

// ============================================================================
// BASIC TIER
// ============================================================================

export interface SalesBreakdownItem {
  item_name: string | null;
  channel: string | null;
  category: string | null;
  quantity: number;
  revenue: number;
}

export interface SalesOverTimeItem {
  sale_date: string; // ISO date string
  quantity: number;
  revenue: number;
}

export interface TopBottomItem {
  item_name: string;
  quantity: number;
  revenue: number;
}

// ============================================================================
// PRO TIER: Menu Mix Insights with Cost Analysis
// ============================================================================

export interface MenuItemCostInsight {
  menu_item_id: number;
  menu_item_name: string;
  category: string | null;
  sales_channel: string | null;
  quantity_sold: number;
  revenue: number;
  recipe_cost: number; // Total ingredient cost for this item's recipe
  total_cost: number; // recipe_cost * quantity_sold
  contribution_margin: number; // revenue - total_cost
  gross_margin_pct: number; // (contribution_margin / revenue) * 100
  food_cost_pct: number; // (total_cost / revenue) * 100
  metric: number;
  percent_of_total: number;
}

export interface SalesOverTimeProItem {
  sale_date: string; // ISO date string
  menu_item_id: number;
  menu_item_name: string;
  quantity: number;
  revenue: number;
  cost: number;
  contribution_margin: number;
  metric: number;
}

export interface TopBottomProItem {
  menu_item_id: number;
  menu_item_name: string;
  quantity_sold: number;
  revenue: number;
  recipe_cost: number;
  total_cost: number;
  contribution_margin: number;
  gross_margin_pct: number;
  food_cost_pct: number;
  metric: number;
}

export interface SalesDateRange {
  min_date?: string | null;
  max_date?: string | null;
}

// ============================================================================
// MASTER TIER (Future)
// ============================================================================
// TODO: Add cost trend analysis, supplier pricing history, recipe optimization

// ============================================================================
// Request Parameters
// ============================================================================

export interface SalesQueryParams {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  byRevenue?: boolean;
}

export interface TopBottomQueryParams extends SalesQueryParams {
  top?: boolean;
  count?: number;
}
