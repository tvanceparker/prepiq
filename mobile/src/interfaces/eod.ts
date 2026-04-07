export type EodRunStatus = 'processing' | 'success' | 'partial' | 'failed';
export type EodForecastStatus = 'ready' | 'stale' | 'degraded' | 'failed';

export interface EodStageStatus {
  stage: string;
  completed: boolean;
  duration_ms: number | null;
}

export interface EodRunError {
  stage: string;
  message: string;
  ts?: string | null;
}

export interface EodForecastState {
  forecast_generated_at: string | null;
  forecast_stale: boolean;
  forecast_status: EodForecastStatus;
  forecast_status_message: string | null;
}

export interface EodRunCounts {
  sales_usage_log_count: number;
  forecast_menu_items_processed: number;
  purchase_order_suggestion_count: number;
  purchase_orders_created: number;
  open_discrepancy_count: number;
}

export interface EodRepairTarget {
  alert_id: number | null;
  ingredient_id: number | null;
  batch_recipe_id: number | null;
  item_name: string | null;
  message: string;
  shortfall_quantity: number;
  unit: string | null;
}

export interface EodRunSummary {
  run_date: string;
  status: EodRunStatus;
  status_message: string;
  finalized: boolean;
  running: boolean;
  started_at: string | null;
  finished_at: string | null;
  stages: EodStageStatus[];
  errors: EodRunError[];
  forecast: EodForecastState;
  counts: EodRunCounts;
  repair_targets: EodRepairTarget[];
}
