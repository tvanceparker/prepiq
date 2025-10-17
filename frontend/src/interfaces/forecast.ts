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
  item_name: string | null;
  channel: string | null;
  category: string | null;
  quantity: number;
  revenue: number;
  recipe_cost: number; // Total ingredient cost for this item's recipe
  total_cost: number; // recipe_cost * quantity
  contribution_margin: number; // revenue - total_cost
  gross_margin_pct: number; // (contribution_margin / revenue) * 100
  food_cost_pct: number; // (total_cost / revenue) * 100
}

export interface SalesOverTimeProItem {
  sale_date: string; // ISO date string
  quantity: number;
  revenue: number;
  recipe_cost: number;
  total_cost: number;
  contribution_margin: number;
  gross_margin_pct: number;
  food_cost_pct: number;
}

export interface TopBottomProItem {
  item_name: string;
  quantity: number;
  revenue: number;
  recipe_cost: number;
  total_cost: number;
  contribution_margin: number;
  gross_margin_pct: number;
  food_cost_pct: number;
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
