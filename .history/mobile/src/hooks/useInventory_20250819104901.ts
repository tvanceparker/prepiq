import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllInventory, fetchInventoryDetails, fetchAllSuppliers, updateSupplier, createSupplier } from '../api/inventory';
import { InventoryItemDTO, SupplierDTO } from '../interfaces/inventory';

export function useInventoryList() {
  return useQuery<InventoryItemDTO[]>({ queryKey: ['inventory','list'], queryFn: async () => (await fetchAllInventory()).data });
}

export function useInventoryDetails(id?: number) {
  return useQuery({ enabled: !!id, queryKey: ['inventory','details',id], queryFn: async () => (await fetchInventoryDetails(id!)).data });
}

export function useSuppliers() {
  return useQuery<SupplierDTO[]>({ queryKey: ['suppliers'], queryFn: async () => (await fetchAllSuppliers()).data.data });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: updateSupplier, onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); } });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createSupplier, onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); } });
}
