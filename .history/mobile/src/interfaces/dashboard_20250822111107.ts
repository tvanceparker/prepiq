// Mobile DTOs aligned with backend FastAPI schemas

// --- Dashboard overview ---
export interface ForecastItemDTO {
	menu_item_id: number;
	name: string;
	forecasted_quantity: number;
}

export interface AccuracyDTO {
	accuracy_percent: number;
	note?: string;
}

export interface DailyOverviewDTO {
	forecasted_sales_today?: { forecasted_quantity: number; forecasted_revenue: number };
	top_5_items_today: ForecastItemDTO[];
	accuracy_yesterday?: AccuracyDTO;
}

// --- Menu items (subset used on mobile) ---
export interface MenuItemDTO {
	menu_item_id: number;
	name: string;
	price?: number;
	category?: string | null;
	is_active?: boolean; // default true on backend when omitted
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
	// keys are channel names; backend may use null for unspecified, surfaced as string 'null' in mobile
	conflicts: Record<string, number>;
}

