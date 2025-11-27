// src/pages/inventory/hooks/useSuppliers.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  updateIngredientSupplier,
} from '../../../api/inventory';
import type { SupplierDTO, SupplierIngredient } from '../../../interfaces/inventory';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export function useSuppliers() {
  const queryClient = useQueryClient();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDTO | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SupplierDTO | null>(null);

  // Detail view state
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(null);

  // Ingredient editing state
  const [editingIngredient, setEditingIngredient] = useState<SupplierIngredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState({
    unit: '',
    cost_per_unit: '',
    lead_time_days: '',
    spoilage_rate: '',
    shelf_life_days: '',
    preferred: false,
    min_order_quantity: '',
    supplier_priority: '',
    pack_size: '',
    quantity_per_pack_item: '',
  });
  const [savingIngredient, setSavingIngredient] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Form state for supplier
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    region: '',
    contact_info: '',
    rating: '',
    website: '',
    is_active: true,
    supplier_feedback: '',
    contract_status: 'Active',
  });

  // Queries
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchAllSuppliers,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<SupplierDTO>) => createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<SupplierDTO>) => updateSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (supplierId: number) => deleteSupplier(supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const suppliers = suppliersQuery.data ?? [];

  // Filter suppliers
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter(s => (s.is_active ?? true) === filterActive);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.type?.toLowerCase().includes(query) ||
          s.region?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [suppliers, filterActive, searchQuery]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    setRefreshing(false);
  }, [queryClient]);

  // Reset form data
  const resetFormData = useCallback(() => {
    setFormData({
      name: '',
      type: '',
      region: '',
      contact_info: '',
      rating: '',
      website: '',
      is_active: true,
      supplier_feedback: '',
      contract_status: 'Active',
    });
  }, []);

  // Open create dialog
  const openCreate = useCallback(() => {
    resetFormData();
    setShowCreateDialog(true);
  }, [resetFormData]);

  // Open edit dialog
  const openEdit = useCallback((supplier: SupplierDTO) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      type: supplier.type || '',
      region: supplier.region || '',
      contact_info: supplier.contact_info || '',
      rating: supplier.rating?.toString() || '',
      website: supplier.website || '',
      is_active: supplier.is_active ?? true,
      supplier_feedback: supplier.supplier_feedback || '',
      contract_status: supplier.contract_status || 'Active',
    });
  }, []);

  // Close create dialog
  const closeCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
    resetFormData();
  }, [resetFormData]);

  // Close edit dialog
  const closeEditDialog = useCallback(() => {
    setEditingSupplier(null);
    resetFormData();
  }, [resetFormData]);

  // Handle create
  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) return;
    try {
      await createMutation.mutateAsync({
        ...formData,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
      });
      setShowCreateDialog(false);
      resetFormData();
      setSnackbar({
        visible: true,
        message: 'Supplier created successfully',
        type: 'success',
      });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to create supplier',
        type: 'error',
      });
    }
  }, [formData, createMutation, resetFormData]);

  // Handle update
  const handleUpdate = useCallback(async () => {
    if (!editingSupplier || !formData.name.trim()) return;
    try {
      await updateMutation.mutateAsync({
        supplier_id: editingSupplier.supplier_id,
        ...formData,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
      });
      setEditingSupplier(null);
      resetFormData();
      setSnackbar({
        visible: true,
        message: 'Supplier updated successfully',
        type: 'success',
      });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to update supplier',
        type: 'error',
      });
    }
  }, [editingSupplier, formData, updateMutation, resetFormData]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteMutation.mutateAsync(deleteConfirm.supplier_id);
      setDeleteConfirm(null);
      setSnackbar({
        visible: true,
        message: 'Supplier deleted successfully',
        type: 'success',
      });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to delete supplier',
        type: 'error',
      });
    }
  }, [deleteConfirm, deleteMutation]);

  // Toggle expanded supplier
  const toggleExpand = useCallback((supplierId: number) => {
    setExpandedSupplierId(prev => (prev === supplierId ? null : supplierId));
  }, []);

  // Open ingredient edit
  const openIngredientEdit = useCallback((ing: SupplierIngredient) => {
    setEditingIngredient(ing);
    setIngredientForm({
      unit: ing.unit || '',
      cost_per_unit: ing.cost_per_unit?.toString() || '',
      lead_time_days: ing.lead_time_days?.toString() || '',
      spoilage_rate: ing.spoilage_rate?.toString() || '',
      shelf_life_days: ing.shelf_life_days?.toString() || '',
      preferred: ing.preferred || false,
      min_order_quantity: ing.min_order_quantity?.toString() || '',
      supplier_priority: ing.supplier_priority?.toString() || '',
      pack_size: ing.pack_size?.toString() || '',
      quantity_per_pack_item: ing.quantity_per_pack_item?.toString() || '',
    });
  }, []);

  // Close ingredient edit
  const closeIngredientEdit = useCallback(() => {
    setEditingIngredient(null);
  }, []);

  // Save ingredient changes
  const handleSaveIngredient = useCallback(async () => {
    if (!editingIngredient) return;
    setSavingIngredient(true);
    try {
      await updateIngredientSupplier({
        ingredient_supplier_id: editingIngredient.ingredient_supplier_id,
        unit: ingredientForm.unit || null,
        cost_per_unit: ingredientForm.cost_per_unit
          ? parseFloat(ingredientForm.cost_per_unit)
          : null,
        lead_time_days: ingredientForm.lead_time_days
          ? parseInt(ingredientForm.lead_time_days)
          : null,
        spoilage_rate: ingredientForm.spoilage_rate
          ? parseFloat(ingredientForm.spoilage_rate)
          : null,
        shelf_life_days: ingredientForm.shelf_life_days
          ? parseInt(ingredientForm.shelf_life_days)
          : null,
        preferred: ingredientForm.preferred,
        min_order_quantity: ingredientForm.min_order_quantity
          ? parseInt(ingredientForm.min_order_quantity)
          : null,
        supplier_priority: ingredientForm.supplier_priority
          ? parseInt(ingredientForm.supplier_priority)
          : null,
        pack_size: ingredientForm.pack_size ? parseInt(ingredientForm.pack_size) : null,
        quantity_per_pack_item: ingredientForm.quantity_per_pack_item
          ? parseFloat(ingredientForm.quantity_per_pack_item)
          : null,
      });
      setSnackbar({
        visible: true,
        message: 'Ingredient updated successfully',
        type: 'success',
      });
      setEditingIngredient(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to update ingredient',
        type: 'error',
      });
    } finally {
      setSavingIngredient(false);
    }
  }, [editingIngredient, ingredientForm, queryClient]);

  // Group ingredients by category
  const groupIngredients = useCallback((ingredients: SupplierIngredient[]) => {
    const groups: Record<string, SupplierIngredient[]> = {};
    ingredients.forEach(ing => {
      const category = ing.ingredient_name?.charAt(0).toUpperCase() || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(ing);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  // Dismiss snackbar
  const dismissSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, visible: false }));
  }, []);

  return {
    // Data
    suppliers: filteredSuppliers,
    allSuppliers: suppliers,

    // Loading states
    loading: suppliersQuery.isLoading,
    refreshing,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    savingIngredient,

    // Filter state
    searchQuery,
    filterActive,

    // Dialog state
    showCreateDialog,
    editingSupplier,
    deleteConfirm,
    expandedSupplierId,
    editingIngredient,
    ingredientForm,
    snackbar,
    formData,

    // Actions
    setSearchQuery,
    setFilterActive,
    setFormData,
    setIngredientForm,
    setDeleteConfirm,
    onRefresh,
    openCreate,
    openEdit,
    closeCreateDialog,
    closeEditDialog,
    handleCreate,
    handleUpdate,
    handleDelete,
    toggleExpand,
    openIngredientEdit,
    closeIngredientEdit,
    handleSaveIngredient,
    dismissSnackbar,

    // Helpers
    groupIngredients,
  };
}

export default useSuppliers;
