// src/interfaces/menu.ts

export interface MenuItemIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  recipe_id: number;
  name: string; // Backend returns 'name', not 'recipe_name'
  recipe_name?: string; // Alias for compatibility
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
  prep_time_minutes?: number;
  ingredients: RecipeIngredient[];
  restaurant_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  recipe_ingredient_id?: number;
  ingredient_id?: number;
  reference_id?: number; // Backend uses reference_id
  name?: string; // Backend returns 'name' for ingredient name
  ingredient_name?: string; // Alias for compatibility
  quantity?: number;
  quantity_used?: number; // Backend uses quantity_used
  unit?: string;
  type?: string; // 'ingredient' or 'batch_recipe'
}

// Recipe with ingredients (as returned from backend)
export interface MenuItemRecipe {
  recipe_id: number;
  recipe_name: string;
  ingredients: MenuItemIngredient[];
}

export interface MenuItem {
  menu_item_id: number;
  restaurant_id?: number;
  menu_item_name: string; // Backend returns menu_item_name
  name?: string; // Alias for compatibility
  price: number;
  category?: string;
  description?: string;
  is_active: boolean;
  recipe_id?: number;
  recipe?: Recipe;
  recipes?: MenuItemRecipe[]; // Backend returns recipes array
  created_at?: string;
  updated_at?: string;
}

export interface MenuItemCreate {
  name: string;
  price: number;
  category?: string;
  description?: string;
  is_active?: boolean;
  recipe_id?: number;
  recipes?: number[]; // Array of recipe IDs
}

export interface MenuItemUpdate {
  name?: string;
  price?: number;
  category?: string;
  description?: string;
  is_active?: boolean;
  recipe_id?: number;
  recipes?: number[]; // Array of recipe IDs
}

export interface BatchRecipe {
  batch_recipe_id: number;
  restaurant_id: number;
  batch_name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  shelf_life_days?: number;
  ingredients: BatchRecipeIngredient[];
  created_at?: string;
  updated_at?: string;
}

export interface BatchRecipeIngredient {
  batch_recipe_ingredient_id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity_needed: number;
  unit?: string;
}

export interface BatchRecipeCreate {
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

export interface BatchRecipeUpdate {
  batch_name?: string;
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
  shelf_life_days?: number;
  ingredients?: Array<{
    ingredient_id: number;
    quantity_needed: number;
  }>;
}

export interface Ingredient {
  ingredient_id: number;
  name: string;
  category?: string;
  unit?: string;
  policy_type?:
    | 'fresh_perishable'
    | 'stable_stocked'
    | 'recipe_dependent'
    | 'intermittent_low_turn'
    | null;
  policy_assignment_mode?: 'system' | 'manual' | null;
  target_service_level?: number | null;
  service_level_z?: number | null;
  policy_override_reason?: string | null;
  current_stock?: number;
  reorder_point?: number;
  cost_per_unit?: number;
}

export interface IngredientWithSuppliers extends Ingredient {
  suppliers: Array<{
    supplier_id: number;
    supplier_name: string;
    cost_per_unit: number;
    lead_time_days: number;
    review_period_days?: number | null;
    order_schedule_type?: 'ad_hoc' | 'fixed_days_of_week' | 'every_n_days' | null;
    allowed_order_days?: string[] | null;
    allowed_delivery_days?: string[] | null;
    cadence_source?: 'manual' | 'inferred' | 'default' | null;
    cadence_confidence_score?: number | null;
    preferred: boolean;
  }>;
}

export interface RecipeCreate {
  recipe_name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes?: number;
  ingredients: Array<{
    ingredient_id: number;
    quantity: number;
    unit: string;
  }>;
}

export interface RecipeUpdate {
  recipe_name?: string;
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
  prep_time_minutes?: number;
  ingredients?: Array<{
    ingredient_id: number;
    quantity: number;
    unit: string;
  }>;
}
