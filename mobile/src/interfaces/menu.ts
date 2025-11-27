// src/interfaces/menu.ts

export interface MenuItemIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  recipe_id: number;
  recipe_name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  prep_time_minutes?: number;
  ingredients: RecipeIngredient[];
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  recipe_ingredient_id?: number;
  ingredient_id: number;
  ingredient_name?: string;
  quantity: number;
  unit: string;
}

export interface MenuItem {
  menu_item_id: number;
  restaurant_id: number;
  name: string;
  price: number;
  category?: string;
  description?: string;
  is_active: boolean;
  recipe_id?: number;
  recipe?: Recipe;
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
}

export interface MenuItemUpdate {
  name?: string;
  price?: number;
  category?: string;
  description?: string;
  is_active?: boolean;
  recipe_id?: number;
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
