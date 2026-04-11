// src/interfaces/prep.ts
import type { AlertColor } from '@mui/material';

export type BatchComponentType = 'ingredient' | 'batch';

export interface IngredientOption {
  ingredient_id: number;
  name: string;
  unit?: string | null;
  category?: string | null;
  is_active?: boolean;
}

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
  is_active?: boolean;
  ingredients?: BatchRecipeIngredient[];
  used_in_recipes?: BatchRecipeRecipeLink[];
}

export interface BatchRecipeIngredient {
  ingredient_type: BatchComponentType;
  reference_id: number;
  ingredient_id?: number | null;
  batch_recipe_id?: number | null;
  ingredient_name: string;
  quantity_used: number;
  unit: string;
}

export interface BatchRecipeRecipeLink {
  recipe_id: number;
  recipe_name: string;
  recipe_description?: string | null;
  is_active?: boolean;
}

export interface BatchRecipeBatchLink {
  batch_recipe_id: number;
  batch_recipe_name: string;
  is_active?: boolean;
}

export interface BatchRecipeUsageResponse {
  batch_recipe_id: number;
  batch_recipe_name: string;
  is_active: boolean;
  usage: {
    recipes: BatchRecipeRecipeLink[];
    batches: BatchRecipeBatchLink[];
    prep_schedule_count: number;
    inventory_lot_count: number;
    recipe_count: number;
    batch_count: number;
  };
}

export interface BatchRecipeFormIngredient {
  ingredient_type: BatchComponentType;
  reference_id?: number | null;
  ingredient_id?: number | null;
  quantity_used: string;
  unit: string;
}

export interface BatchRecipeFormState {
  batch_recipe_id?: number;
  name: string;
  description: string;
  yield_quantity: string;
  yield_unit: string;
  estimated_prep_time_minutes: string;
  shelf_life_days: string;
  ingredients: BatchRecipeFormIngredient[];
}

export interface BatchRecipePayload {
  name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  estimated_prep_time_minutes?: number;
  shelf_life_days?: number;
  ingredients: Array<{
    ingredient_id?: number;
    reference_id?: number;
    ingredient_type: BatchComponentType;
    quantity_used: number;
    unit: string;
  }>;
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
