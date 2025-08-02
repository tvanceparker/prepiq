// src/api/menu.js
import { get, post, put, patch, del } from "./index.ts";

// Menu Items
export const getMenuItems = () => get("/menu/get_menu_items");
export const createMenuItem = (data) => post("/menu/create", data);
export const updateMenuItem = (menuItemId, data) =>
    patch(`/menu/menu_items/${menuItemId}`, data);
export const deleteMenuItem = (menuItemId) => del(`/menu/delete/${menuItemId}`);

// Batch Recipes
export const getAllBatchRecipes = () => get("/menu/batch_recipes/get_all_batch_recipes");

// Ingredients
export const getAllIngredients = () => get("/menu/ingredients/get_all_ingredients");
export const getIngredientsWithSuppliers = () => get("/menu/ingredients/with-suppliers");
export const upsertIngredient = (data) => post("/menu/ingredients/upsert", data);

// Recipes
export const getRecipes = () => get("/menu/recipes/get_recipes");
export const getRecipesWithIngredients = () => get("/menu/recipes_with_ingredients");
export const createRecipeWithIngredients = (data) => post("/menu/recipes", data);
export const updateRecipeWithIngredients = (recipeId, data) =>
    patch(`/menu/recipes/${recipeId}`, data);
export const updateRecipe = (recipeId, data) =>
    put(`/menu/recipes/${recipeId}`, data);

export const deleteRecipe = (recipeId) => del(`/menu/recipes/${recipeId}`);
