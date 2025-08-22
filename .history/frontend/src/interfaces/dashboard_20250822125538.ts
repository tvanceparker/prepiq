// Frontend DTOs aligned with backend FastAPI schemas (app/schemas/dashboard_dto.py)

// --- Dashboard overview ---
export interface ForecastItemDTO {
  menu_item_id: number;
  name: string;
  forecasted_quantity: number;
}

export interface AccuracyDTO {
  accuracy_percent: number | null;
  note?: string;
}

export interface DailyOverviewDTO {
  forecasted_sales_today?: { forecasted_quantity: number; forecasted_revenue: number };
  top_5_items_today: ForecastItemDTO[];
  accuracy_yesterday?: AccuracyDTO;
}

// --- Menu items ---
export interface MenuItemDTO {
  menu_item_id: number;
  name: string;
  price?: number;
  category?: string | null;
  is_active?: boolean;
}

export interface MenuItemCreateDTO {
  name: string;
  category?: string | null;
  price: number;
  is_active?: boolean;
}

export interface MenuItemUpdateDTO {
  name?: string;
  category?: string | null;
  price?: number;
  is_active?: boolean;
}

// --- Manual EOD sales upload ---
export interface EodSalesEntryDTO {
  menu_item_id: number;
  quantity_sold: number;
  sales_channel?: string | null;
}

export interface EodSalesEntriesInDTO {
  sale_date: string; // YYYY-MM-DD
  overwrite?: boolean;
  entries: EodSalesEntryDTO[];
}

// --- Sales conflicts check ---
export interface SalesConflictOutDTO {
  sale_date: string; // YYYY-MM-DD
  conflicts: Record<string, number>; // channel -> count; use 'null' string to represent unspecified when needed
}
