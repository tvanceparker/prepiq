// frontend/src/interfaces/dashboardInterfaceFrontend.ts
export interface ForecastedSalesBasic {
  forecasted_quantity: number;
  forecasted_revenue: number;
}

export interface TopForecastedItem {
  menu_item_id: number;
  name: string;
  forecasted_quantity: number;
}

export interface AccuracyBasicOut {
  accuracy_percent?: number | null;
  note: string;
}

export interface DailyOverviewDTO {
  forecasted_sales_today?: ForecastedSalesBasic | null;
  top_5_items_today?: TopForecastedItem[];
  accuracy_yesterday?: AccuracyBasicOut | null;
}

export interface MenuItemDTO {
  menu_item_id: number;
  name: string;
  category?: string | null;
  price: number;
  is_active: boolean;
}

export interface SalesConflictOutDTO {
  sale_date: string;
  conflicts: Record<string, number>;
}

export interface EodSalesEntryDTO {
  menu_item_id: number;
  quantity_sold: number;
  sales_channel?: string | null;
}

export interface EodSalesEntriesInDTO {
  sale_date: string;
  entries: EodSalesEntryDTO[];
  overwrite?: boolean;
}
