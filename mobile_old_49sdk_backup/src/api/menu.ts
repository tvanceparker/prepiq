import { get, post, put, patch, del } from './index';

export const getMenuItems = () => get('/menu/get_menu_items');
export const createMenuItem = (data: any) => post('/menu/create', data);
export const updateMenuItem = (menuItemId: number | string, data: any) => patch(`/menu/menu_items/${menuItemId}`, data);
export const deleteMenuItem = (menuItemId: number | string) => del(`/menu/delete/${menuItemId}`);

export const getAllBatchRecipes = () => get('/menu/batch_recipes/get_all_batch_recipes');
export const getAllIngredients = () => get('/menu/ingredients/get_all_ingredients');
export const getIngredientsWithSuppliers = () => get('/menu/ingredients/with-suppliers');
export const upsertIngredient = (data: any) => post('/menu/ingredients/upsert', data);

export const getRecipes = () => get('/menu/recipes/get_recipes');
export const getRecipesWithIngredients = () => get('/menu/recipes_with_ingredients');
export const createRecipeWithIngredients = (data: any) => post('/menu/recipes', data);
export const updateRecipeWithIngredients = (recipeId: number | string, data: any) => patch(`/menu/recipes/${recipeId}`, data);
export const updateRecipe = (recipeId: number | string, data: any) => put(`/menu/recipes/${recipeId}`, data);
export const deleteRecipe = (recipeId: number | string) => del(`/menu/recipes/${recipeId}`);
