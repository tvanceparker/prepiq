// src/pages/menu/hooks/useRecipeEditor.ts
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRecipesWithIngredients,
  createRecipeWithIngredients,
  updateRecipeWithIngredients,
  deleteRecipe,
  getAllIngredients,
} from '../../../api/menu';
import type { Recipe, RecipeCreate, RecipeUpdate, Ingredient } from '../../../interfaces/menu';

interface SnackbarState {
  visible: boolean;
  message: string;
}

export function useRecipeEditor() {
  const queryClient = useQueryClient();

  // UI State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
  });

  // Fetch recipes
  const recipesQuery = useQuery({
    queryKey: ['menu', 'recipes'],
    queryFn: getRecipesWithIngredients,
  });

  // Fetch ingredients
  const ingredientsQuery = useQuery({
    queryKey: ['menu', 'ingredients'],
    queryFn: getAllIngredients,
  });

  // Mutations
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

  const recipes = recipesQuery.data ?? [];
  const ingredients = ingredientsQuery.data ?? [];

  // Open create dialog
  const openCreate = useCallback(() => {
    setEditingRecipe(null);
    setDialogOpen(true);
  }, []);

  // Open edit dialog
  const openEdit = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setDialogOpen(true);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingRecipe(null);
  }, []);

  // Handle save
  const handleSave = useCallback(
    async (data: {
      name: string;
      description?: string;
      ingredients: { ingredient_id: number; quantity: number; unit: string }[];
    }) => {
      setSaving(true);
      try {
        const payload = {
          recipe_name: data.name, // API expects recipe_name
          description: data.description,
          ingredients: data.ingredients,
          yield_quantity: 1,
          yield_unit: 'batch',
        };

        if (editingRecipe) {
          await updateMutation.mutateAsync({
            id: editingRecipe.recipe_id,
            data: payload,
          });
          setSnackbar({ visible: true, message: 'Recipe updated successfully' });
        } else {
          await createMutation.mutateAsync(payload);
          setSnackbar({ visible: true, message: 'Recipe created successfully' });
        }
        setDialogOpen(false);
        setEditingRecipe(null);
      } catch (err: any) {
        setSnackbar({
          visible: true,
          message: err?.message || 'Failed to save recipe',
        });
      } finally {
        setSaving(false);
      }
    },
    [editingRecipe, createMutation, updateMutation]
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!editingRecipe) return;

    setSaving(true);
    try {
      await deleteMutation.mutateAsync(editingRecipe.recipe_id);
      setSnackbar({ visible: true, message: 'Recipe deleted successfully' });
      setDialogOpen(false);
      setEditingRecipe(null);
    } catch (err: any) {
      setSnackbar({
        visible: true,
        message: err?.message || 'Failed to delete recipe',
      });
    } finally {
      setSaving(false);
    }
  }, [editingRecipe, deleteMutation]);

  // Dismiss snackbar
  const dismissSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    // Data
    recipes,
    ingredients,

    // Loading states
    loading: recipesQuery.isLoading,
    ingredientsLoading: ingredientsQuery.isLoading,
    saving,

    // UI state
    dialogOpen,
    editingRecipe,
    snackbar,

    // Actions
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
    dismissSnackbar,
  };
}

export default useRecipeEditor;
