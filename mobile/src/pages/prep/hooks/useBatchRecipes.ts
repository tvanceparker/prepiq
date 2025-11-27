// src/pages/prep/hooks/useBatchRecipes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBatchRecipes,
  createBatchRecipe,
  updateBatchRecipe,
  deleteBatchRecipe,
  getIngredients,
} from '../../../api/prep';
import type {
  BatchRecipe,
  BatchRecipeCreate,
  BatchRecipeUpdate,
  Ingredient,
} from '../../../interfaces/prep';

// =============================================================================
// Batch Recipes Hook
// =============================================================================

export function useBatchRecipes() {
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ['prep', 'batchRecipes'],
    queryFn: getBatchRecipes,
  });

  const createMutation = useMutation({
    mutationFn: (data: BatchRecipeCreate) => createBatchRecipe(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BatchRecipeUpdate }) =>
      updateBatchRecipe(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBatchRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
  };

  return {
    recipes: (recipesQuery.data ?? []) as BatchRecipe[],
    loading: recipesQuery.isLoading,
    error: recipesQuery.error,

    createRecipe: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateRecipe: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteRecipe: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    refresh,
    refetch: recipesQuery.refetch,
  };
}

// =============================================================================
// Ingredients Hook (for forms)
// =============================================================================

export function useIngredients() {
  const ingredientsQuery = useQuery({
    queryKey: ['prep', 'ingredients'],
    queryFn: getIngredients,
  });

  return {
    ingredients: (ingredientsQuery.data ?? []) as Ingredient[],
    loading: ingredientsQuery.isLoading,
    error: ingredientsQuery.error,
    refetch: ingredientsQuery.refetch,
  };
}
