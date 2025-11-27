// src/interfaces/prep.ts

export interface Ingredient {
  ingredient_id: number;
  name: string;
  category?: string;
  unit?: string;
  cost_per_unit?: number;
}

export interface PrepLogParams {
  start_date?: string;
  end_date?: string;
  status?: string;
  batch_recipe_id?: number;
}

export interface PrepScheduleParams {
  prep_date?: string;
  status?: string;
}

export interface PrepScheduleItem {
  prep_id: number;
  restaurant_id: number;
  batch_recipe_id: number;
  batch_recipe_name?: string;
  scheduled_date: string;
  quantity_to_prep: number;
  quantity_prepped?: number;
  assigned_employee_id?: number;
  assigned_employee_name?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface PrepScheduleCreate {
  batch_recipe_id: number;
  scheduled_date: string;
  quantity_to_prep: number;
  assigned_employee_id?: number;
  notes?: string;
}

export interface PrepScheduleUpdate {
  prep_id: number;
  batch_recipe_id?: number;
  scheduled_date?: string;
  quantity_to_prep?: number;
  quantity_prepped?: number;
  assigned_employee_id?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  prep_time_minutes_actual?: number;
  prep_batch_count?: number;
}

export interface PrepLog {
  prep_id: number;
  batch_recipe_id: number;
  batch_recipe_name?: string;
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
  // Legacy fields for backwards compatibility
  prep_log_id?: number;
  prepped_by_employee_id?: number;
  prepped_by_employee_name?: string;
  prepped_at?: string;
  notes?: string;
}

export interface BatchRecipeIngredient {
  ingredient_id: number;
  ingredient_name?: string;
  quantity_used: number;
  unit: string;
}

export interface BatchRecipe {
  batch_recipe_id: number;
  name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  estimated_prep_time_minutes?: number;
  shelf_life_days?: number;
  ingredients: BatchRecipeIngredient[];
  used_in_recipes?: Array<{
    recipe_id: number;
    recipe_name: string;
    recipe_description?: string;
  }>;
}

export interface BatchRecipeCreate {
  name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  estimated_prep_time_minutes?: number;
  shelf_life_days?: number;
  ingredients?: Array<{
    ingredient_id: number;
    quantity_used: number;
    unit: string;
  }>;
}

export interface BatchRecipeUpdate {
  name?: string;
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
  estimated_prep_time_minutes?: number;
  shelf_life_days?: number;
  ingredients?: Array<{
    ingredient_id: number;
    quantity_used: number;
    unit: string;
  }>;
}

// Legacy interface for backwards compatibility
export interface BatchRecipeData {
  batch_recipe_id?: number;
  batch_name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  shelf_life_days?: number;
  ingredients?: Array<{
    ingredient_id: number;
    quantity_needed: number;
  }>;
}

export interface WasteLogParams {
  start_date?: string;
  end_date?: string;
  item_type?: string;
  waste_type?: string;
}

export interface WasteLog {
  waste_log_id: number;
  restaurant_id: number;
  ingredient_id?: number;
  ingredient_name?: string;
  batch_recipe_id?: number;
  batch_recipe_name?: string;
  quantity_wasted: number;
  unit: string;
  waste_type: 'expired' | 'spoiled' | 'overproduction' | 'damage' | 'other';
  reason: string;
  logged_by_employee_id: number;
  logged_by_employee_name?: string;
  notes?: string;
  created_at: string;
}

export interface WasteLogCreate {
  ingredient_id?: number;
  batch_recipe_id?: number;
  quantity_wasted: number;
  unit: string;
  waste_type: 'expired' | 'spoiled' | 'overproduction' | 'damage' | 'other';
  reason: string;
  notes?: string;
}
