// src/pages/menu/hooks/useIngredientCatalog.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllIngredients,
  getIngredientsWithSuppliers,
  upsertIngredient,
} from '../../../api/menu';
import type { Ingredient, IngredientWithSuppliers } from '../../../interfaces/menu';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

interface IngredientSection {
  title: string;
  data: Ingredient[];
}

export function useIngredientCatalog() {
  const queryClient = useQueryClient();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Fetch ingredients
  const ingredientsQuery = useQuery({
    queryKey: ['menu', 'ingredients'],
    queryFn: getAllIngredients,
  });

  // Fetch ingredients with suppliers
  const ingredientsWithSuppliersQuery = useQuery({
    queryKey: ['menu', 'ingredients', 'withSuppliers'],
    queryFn: getIngredientsWithSuppliers,
  });

  // Mutations
  const upsertMutation = useMutation({
    mutationFn: (data: any) => upsertIngredient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', 'ingredients'] });
    },
  });

  const ingredients = ingredientsQuery.data ?? [];
  const ingredientsWithSuppliers = ingredientsWithSuppliersQuery.data ?? [];

  // Get categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    ingredients.forEach((ing: Ingredient) => {
      if (ing.category) cats.add(ing.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [ingredients]);

  // Filter ingredients
  const filteredIngredients = useMemo(() => {
    let items = ingredients;

    if (categoryFilter !== 'all') {
      items = items.filter((ing: Ingredient) => ing.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter((ing: Ingredient) => ing.name?.toLowerCase().includes(query));
    }

    return items;
  }, [ingredients, categoryFilter, searchQuery]);

  // Group by category for sections
  const sections: IngredientSection[] = useMemo(() => {
    const grouped: Record<string, Ingredient[]> = {};

    filteredIngredients.forEach((ing: Ingredient) => {
      const category = ing.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(ing);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredIngredients]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['menu', 'ingredients'] });
    setRefreshing(false);
  }, [queryClient]);

  // Open create dialog
  const openCreate = useCallback(() => {
    setEditingIngredient(null);
    setDialogOpen(true);
  }, []);

  // Open edit dialog
  const openEdit = useCallback((ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setDialogOpen(true);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingIngredient(null);
  }, []);

  // Handle save
  const handleSave = useCallback(
    async (data: any) => {
      try {
        await upsertMutation.mutateAsync(data);
        setSnackbar({
          visible: true,
          message: editingIngredient
            ? 'Ingredient updated successfully'
            : 'Ingredient created successfully',
          type: 'success',
        });
        setDialogOpen(false);
        setEditingIngredient(null);
      } catch (err: any) {
        setSnackbar({
          visible: true,
          message: err?.message || 'Failed to save ingredient',
          type: 'error',
        });
      }
    },
    [editingIngredient, upsertMutation]
  );

  // Dismiss snackbar
  const dismissSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    // Data
    ingredients: filteredIngredients,
    allIngredients: ingredients,
    ingredientsWithSuppliers,
    sections,
    categories,

    // Loading states
    loading: ingredientsQuery.isLoading,
    refreshing,
    upserting: upsertMutation.isPending,

    // UI state
    searchQuery,
    categoryFilter,
    dialogOpen,
    editingIngredient,
    snackbar,

    // Actions
    setSearchQuery,
    setCategoryFilter,
    onRefresh,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    dismissSnackbar,
  };
}

export default useIngredientCatalog;
