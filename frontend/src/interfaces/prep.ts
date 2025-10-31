// src/interfaces/prep.ts
import type { AlertColor } from '@mui/material';

export interface PrepScheduleState {
  createQuantity: number | string;
  updateTime: number | string;
  updateBatchCount: number | string;
  updateStatus: string;
}

export interface BatchRecipeSnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

export interface PrepLog {
  prep_id: number;
  batch_recipe_id: number;
  batch_recipe_name: string;
  prep_date: string;
  quantity_needed: number;
  quantity_prepped: number | null;
  prep_batch_count: number | null;
  prep_time_minutes_estimated: number | null;
  prep_time_minutes_actual: number | null;
  assigned_employee_id: number | null;
  assigned_employee_name: string | null;
  status: string;
  created_at: string | null;
  expiry_date: string | null;
}

export interface BatchRecipe {
  batch_recipe_id: number;
  name: string;
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
  estimated_prep_time_minutes?: number;
  shelf_life_days?: number;
  ingredients?: any[];
  used_in_recipes?: any[];
}

export interface WasteLog {
  usage_id: number;
  waste_date: string;
  ingredient_id: number;
  ingredient_name: string;
  batch_recipe_id: number | null;
  batch_recipe_name: string | null;
  quantity_wasted: number;
  unit: string;
  waste_type: string;
  reason: string;
  cost_impact: number | null;
  lot_id: number | null;
  notes: string | null;
}

export interface CreateWasteLogRequest {
  ingredient_id?: number;
  batch_recipe_id?: number;
  quantity_wasted: number;
  unit: string;
  waste_type: string;
  reason: string;
  notes?: string;
}
