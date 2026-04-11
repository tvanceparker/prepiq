// src/api/menu.ts
import { get, post, put, patch, del } from './index';
import type {
  MenuBatchRecipeOption,
  MenuIngredientOption,
  MenuItem,
  MenuItemPayload,
  MenuRecipeOption,
  RecipePayload,
  RecipeSummary,
  RecipeUsageResponse,
} from '../interfaces/menu';

// Menu Items
export const getMenuItems = () => get<MenuItem[]>('/menu/get_menu_items');
export const getCategories = () => get<string[]>('/menu/categories');
export const createMenuItem = (data: MenuItemPayload) => post<MenuItem>('/menu/create', data);
export const updateMenuItem = (menuItemId: number, data: Partial<MenuItemPayload>) =>
  patch<MenuItem>(`/menu/menu_items/${menuItemId}`, data);
export const deleteMenuItem = (menuItemId: number) => del(`/menu/delete/${menuItemId}`);

// Batch Recipes
export const getAllBatchRecipes = () =>
  get<MenuBatchRecipeOption[]>('/menu/batch_recipes/get_all_batch_recipes');

// Ingredients
export const getAllIngredients = () =>
  get<MenuIngredientOption[]>('/menu/ingredients/get_all_ingredients');
export const getIngredientsWithSuppliers = () => get('/menu/ingredients/with-suppliers');
export const upsertIngredient = (data: any) => post('/menu/ingredients/upsert', data);
export const deleteIngredient = (ingredientId: number) => del(`/menu/ingredients/${ingredientId}`);

// Recipes
export const getRecipes = () => get<MenuRecipeOption[]>('/menu/recipes/get_recipes');
export const getRecipesWithIngredients = () =>
  get<RecipeSummary[]>('/menu/recipes_with_ingredients');
export const getRecipeUsage = (recipeId: number) =>
  get<RecipeUsageResponse>(`/menu/recipes/${recipeId}/usage`);
export const createRecipeWithIngredients = (data: RecipePayload) => post('/menu/recipes', data);
export const updateRecipeWithIngredients = (recipeId: number, data: RecipePayload) =>
  patch(`/menu/recipes/${recipeId}`, data);
export const updateRecipe = (recipeId: number, data: RecipePayload) =>
  put(`/menu/recipes/${recipeId}`, data);

export const deleteRecipe = (recipeId: number) => del(`/menu/recipes/${recipeId}`);
