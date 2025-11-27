// src/interfaces/prep.ts

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
}

export interface PrepLog {
  prep_log_id: number;
  prep_id: number;
  batch_recipe_id: number;
  batch_recipe_name?: string;
  quantity_prepped: number;
  prepped_by_employee_id: number;
  prepped_by_employee_name?: string;
  prepped_at: string;
  notes?: string;
}

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
