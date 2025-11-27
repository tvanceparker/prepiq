// src/pages/menu/hooks/useMenuBuilder.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMenuItems,
  getCategories,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getRecipesWithIngredients,
} from '../../../api/menu';
import type { MenuItem, MenuItemCreate, MenuItemUpdate, Recipe } from '../../../interfaces/menu';

interface MenuSection {
  title: string;
  data: MenuItem[];
}

export function useMenuBuilder() {
  const queryClient = useQueryClient();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MenuItem | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Fetch menu items
  const menuQuery = useQuery({
    queryKey: ['menu', 'items'],
    queryFn: getMenuItems,
  });

  // Fetch available recipes
  const recipesQuery = useQuery({
    queryKey: ['menu', 'recipes'],
    queryFn: getRecipesWithIngredients,
  });

  // Fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['menu', 'categories'],
    queryFn: getCategories,
  });

  // Mutations
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

  const menuItems = menuQuery.data ?? [];
  const availableRecipes = recipesQuery.data ?? [];
  const availableCategories = categoriesQuery.data ?? [];

  // Get categories from menu items
  const categories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item: MenuItem) => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [menuItems]);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = menuItems;

    if (categoryFilter !== 'all') {
      items = items.filter((item: MenuItem) => item.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item: MenuItem) =>
          (item.menu_item_name || item.name || '').toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [menuItems, categoryFilter, searchQuery]);

  // Group by category for sections
  const sections: MenuSection[] = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};

    filteredItems.forEach((item: MenuItem) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredItems]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['menu'] });
    setRefreshing(false);
  }, [queryClient]);

  // Open create dialog
  const openCreate = useCallback(() => {
    setEditingItem(null);
    setShowCreateDialog(true);
  }, []);

  // Open edit dialog
  const openEdit = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setShowCreateDialog(true);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setShowCreateDialog(false);
    setEditingItem(null);
  }, []);

  // Handle save
  const handleSave = useCallback(
    async (data: {
      name: string;
      description?: string;
      price: number;
      category?: string;
      is_active: boolean;
      recipes: number[];
    }) => {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.menu_item_id,
          data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      setShowCreateDialog(false);
      setEditingItem(null);
    },
    [editingItem, createMutation, updateMutation]
  );

  // Handle delete from dialog
  const handleDeleteFromDialog = useCallback(() => {
    if (editingItem) {
      setDeleteConfirm(editingItem);
      setShowCreateDialog(false);
    }
  }, [editingItem]);

  // Handle delete confirmation
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.menu_item_id);
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteMutation]);

  // Close delete dialog
  const closeDeleteDialog = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Toggle expanded card
  const toggleExpanded = useCallback((id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  return {
    // Data
    menuItems: filteredItems,
    allMenuItems: menuItems,
    sections,
    categories,
    availableRecipes,
    availableCategories,

    // Loading states
    loading: menuQuery.isLoading,
    refreshing,
    recipesLoading: recipesQuery.isLoading,
    categoriesLoading: categoriesQuery.isLoading,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,

    // UI state
    searchQuery,
    categoryFilter,
    showCreateDialog,
    editingItem,
    deleteConfirm,
    expandedId,

    // Actions
    setSearchQuery,
    setCategoryFilter,
    setDeleteConfirm,
    onRefresh,
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDeleteFromDialog,
    handleDelete,
    closeDeleteDialog,
    toggleExpanded,
  };
}

export default useMenuBuilder;
