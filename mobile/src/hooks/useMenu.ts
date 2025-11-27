// src/hooks/useMenu.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAllBatchRecipes,
  getAllIngredients,
  getIngredientsWithSuppliers,
  upsertIngredient,
  getRecipes,
  getRecipesWithIngredients,
  createRecipeWithIngredients,
  updateRecipeWithIngredients,
  deleteRecipe,
} from '../api/menu';
import type {
  MenuItem,
  MenuItemCreate,
  MenuItemUpdate,
  Recipe,
  RecipeCreate,
  RecipeUpdate,
  BatchRecipe,
  Ingredient,
  IngredientWithSuppliers,
} from '../interfaces/menu';

// =============================================================================
// Menu Items Hook
// =============================================================================

export function useMenuItems() {
  const queryClient = useQueryClient();

  const menuQuery = useQuery({
    queryKey: ['menu', 'items'],
    queryFn: getMenuItems,
  });

  const createMutation = useMutation({
    mutationFn: (data: MenuItemCreate) => createMenuItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MenuItemUpdate }) => updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
    },
  });

  // Group by category
  const menuByCategory = (menuQuery.data ?? []).reduce(
    (acc: Record<string, MenuItem[]>, item: MenuItem) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  // Sections for SectionList
  const sections = Object.entries(menuByCategory).map(([category, items]) => ({
    title: category,
    data: items,
  }));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['menu', 'items'] });
  };

  return {
    menuItems: menuQuery.data ?? [],
    menuByCategory,
    sections,
    loading: menuQuery.isLoading,
    error: menuQuery.error,

    createMenuItem: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateMenuItem: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteMenuItem: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Recipes Hook
// =============================================================================

export function useRecipes() {
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ['menu', 'recipes'],
    queryFn: getRecipesWithIngredients,
  });

  const createMutation = useMutation({
    mutationFn: (data: RecipeCreate) => createRecipeWithIngredients(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'recipes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecipeUpdate }) =>
      updateRecipeWithIngredients(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'recipes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'recipes'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['menu', 'recipes'] });
  };

  return {
    recipes: recipesQuery.data ?? [],
    loading: recipesQuery.isLoading,
    error: recipesQuery.error,

    createRecipe: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateRecipe: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteRecipe: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Batch Recipes Hook (from menu)
// =============================================================================

export function useMenuBatchRecipes() {
  const batchQuery = useQuery({
    queryKey: ['menu', 'batchRecipes'],
    queryFn: getAllBatchRecipes,
  });

  return {
    batchRecipes: batchQuery.data ?? [],
    loading: batchQuery.isLoading,
    error: batchQuery.error,
  };
}

// =============================================================================
// Ingredients Hook (from menu)
// =============================================================================

export function useIngredients() {
  const queryClient = useQueryClient();

  const ingredientsQuery = useQuery({
    queryKey: ['menu', 'ingredients'],
    queryFn: getAllIngredients,
  });

  const ingredientsWithSuppliersQuery = useQuery({
    queryKey: ['menu', 'ingredients', 'withSuppliers'],
    queryFn: getIngredientsWithSuppliers,
  });

  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertIngredient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'ingredients'] });
    },
  });

  // Group by category
  const ingredientsByCategory = (ingredientsQuery.data ?? []).reduce(
    (acc: Record<string, Ingredient[]>, ing: Ingredient) => {
      const category = ing.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(ing);
      return acc;
    },
    {} as Record<string, Ingredient[]>
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['menu', 'ingredients'] });
  };

  return {
    ingredients: ingredientsQuery.data ?? [],
    ingredientsWithSuppliers: ingredientsWithSuppliersQuery.data ?? [],
    ingredientsByCategory,
    loading: ingredientsQuery.isLoading,
    error: ingredientsQuery.error,

    upsertIngredient: upsertMutation.mutateAsync,
    upserting: upsertMutation.isPending,

    refresh,
  };
}

export default useMenuItems;
