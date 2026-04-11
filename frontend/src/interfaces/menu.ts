import type { BatchRecipe, IngredientOption } from './prep';

export type RecipeComponentType = 'ingredient' | 'batch' | 'recipe';

export interface MenuItemIngredientSummary {
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  unit: string;
}

export interface MenuItemRecipeSummary {
  recipe_id: number;
  recipe_name: string;
  ingredients: MenuItemIngredientSummary[];
}

export interface MenuItem {
  menu_item_id: number;
  menu_item_name: string;
  price: number;
  category?: string | null;
  is_active: boolean;
  recipes: MenuItemRecipeSummary[];
}

export interface MenuItemPayload {
  name: string;
  price: number;
  category?: string;
  recipes?: number[];
  is_active?: boolean;
}

export interface RecipeComponent {
  name: string;
  quantity: number;
  unit: string;
  type: RecipeComponentType;
  reference_id: number;
}

export interface RecipeSummary {
  recipe_id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
  ingredients: RecipeComponent[];
  restaurant_id?: number;
}

export interface RecipeDependencySummary {
  recipe_id: number;
  recipe_name: string;
  is_active: boolean;
}

export interface RecipeMenuUsageSummary {
  menu_item_id: number;
  menu_item_name: string;
  is_active: boolean;
}

export interface RecipeUsageResponse {
  recipe_id: number;
  recipe_name: string;
  is_active: boolean;
  usage: {
    menu_items: RecipeMenuUsageSummary[];
    nested_in_recipes: RecipeDependencySummary[];
    menu_item_count: number;
    nested_recipe_count: number;
  };
}

export interface RecipePayloadIngredient {
  ingredient_id?: number;
  reference_id?: number;
  quantity: number;
  unit: string;
  type: RecipeComponentType;
  ingredient_type?: RecipeComponentType;
}

export interface RecipePayload {
  name: string;
  description?: string;
  ingredients: RecipePayloadIngredient[];
}

export interface RecipeComponentDraft {
  name: string;
  quantity: string;
  unit: string;
  type: RecipeComponentType;
  reference_id: string;
}

export interface RecipeEditorForm {
  recipe_name: string;
  instructions: string;
  ingredients: RecipeComponentDraft[];
}

export interface ReferenceOption {
  id: number;
  name: string;
  unit?: string | null;
  type: RecipeComponentType;
  subtitle?: string;
}

export interface MenuBuilderStats {
  totalItems: number;
  activeItems: number;
  categoryCount: number;
  linkedRecipeCount: number;
}

export interface RecipeEditorStats {
  totalRecipes: number;
  nestedRecipeCount: number;
  batchBackedCount: number;
  totalComponents: number;
}

export type MenuRecipeOption = Pick<RecipeSummary, 'recipe_id' | 'name'>;
export type MenuIngredientOption = IngredientOption;
export type MenuBatchRecipeOption = BatchRecipe;
