// src/hooks/useSuppliers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../api/inventory';
import type { SupplierDTO } from '../interfaces/inventory';

export function useSuppliers() {
  const queryClient = useQueryClient();

  // Fetch all suppliers
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchAllSuppliers,
  });

  // Create supplier mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<SupplierDTO>) => createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  // Update supplier mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SupplierDTO>) => updateSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: (supplierId: number) => deleteSupplier(supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  };

  return {
    suppliers: suppliersQuery.data ?? [],
    loading: suppliersQuery.isLoading,
    error: suppliersQuery.error,
    isRefetching: suppliersQuery.isRefetching,

    createSupplier: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateSupplier: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteSupplier: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    refresh,
  };
}

export default useSuppliers;
