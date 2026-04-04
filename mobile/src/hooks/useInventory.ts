// src/hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllInventory,
  fetchInventoryDetails,
  fetchLotInfo,
  fetchUsedUsageLogs,
  fetchWastedUsageLogs,
  adjustInventory,
  getInventoryDeductionDiscrepancies,
  getInventoryAdjustments,
  setInventoryCurrentStock,
} from '../api/inventory';
import type {
  InventoryAdjustmentResult,
  InventoryDeductionDiscrepancy,
  InventoryItem,
  LotInfo,
  UsageLog,
} from '../interfaces/inventory';

export interface UseInventoryOptions {
  autoRefresh?: boolean;
  refetchInterval?: number;
}

export function useInventory(options: UseInventoryOptions = {}) {
  const queryClient = useQueryClient();
  const { autoRefresh = false, refetchInterval = 60000 } = options;

  // Fetch all inventory - returns InventoryItem[] with packaging_breakdown
  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: fetchAllInventory,
    refetchInterval: autoRefresh ? refetchInterval : false,
  });

  const discrepanciesQuery = useQuery({
    queryKey: ['inventory', 'discrepancies'],
    queryFn: getInventoryDeductionDiscrepancies,
    refetchInterval: autoRefresh ? refetchInterval : false,
  });

  // Cast the data to InventoryItem[] since that's what the backend returns
  const inventory = (inventoryQuery.data ?? []) as unknown as InventoryItem[];

  // Group inventory by category for SectionList
  const inventoryByCategory = inventory.reduce(
    (acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, InventoryItem[]>
  );

  // Get sections for SectionList
  const sections = Object.entries(inventoryByCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({
      title: category,
      data: items,
    }));

  // Adjustment mutation
  const adjustMutation = useMutation({
    mutationFn: adjustInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const setCurrentStockMutation = useMutation({
    mutationFn: setInventoryCurrentStock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const discrepancies = (discrepanciesQuery.data ?? []) as InventoryDeductionDiscrepancy[];

  return {
    inventory,
    inventoryByCategory,
    sections,
    discrepancies,
    loading: inventoryQuery.isLoading,
    error: inventoryQuery.error,
    isRefetching: inventoryQuery.isRefetching,
    discrepancyLoading: discrepanciesQuery.isLoading,
    discrepancyError: discrepanciesQuery.error,

    adjustInventory: adjustMutation.mutateAsync,
    adjusting: adjustMutation.isPending,
    setCurrentStock: setCurrentStockMutation.mutateAsync as (payload: {
      inventory_id: number;
      counted_quantity: number;
      lot_id?: number | null;
      reason?: string | null;
      notes?: string;
    }) => Promise<InventoryAdjustmentResult>,
    reconciling: setCurrentStockMutation.isPending,

    refresh,
  };
}

// Hook for fetching details of a specific inventory item
export function useInventoryDetails(inventoryId: number | null) {
  const detailsQuery = useQuery({
    queryKey: ['inventory', 'details', inventoryId],
    queryFn: () => fetchInventoryDetails(inventoryId!),
    enabled: inventoryId !== null,
  });

  return {
    details: detailsQuery.data,
    loading: detailsQuery.isLoading,
    error: detailsQuery.error,
  };
}

// Hook for fetching lot information with usage logs
export function useLotInfo(lotId: number | null) {
  const lotQuery = useQuery({
    queryKey: ['inventory', 'lot', lotId],
    queryFn: () => fetchLotInfo(lotId!) as Promise<LotInfo>,
    enabled: lotId !== null,
  });

  const usedLogsQuery = useQuery({
    queryKey: ['inventory', 'lot', lotId, 'used'],
    queryFn: () => fetchUsedUsageLogs(lotId!) as Promise<UsageLog[]>,
    enabled: lotId !== null,
  });

  const wastedLogsQuery = useQuery({
    queryKey: ['inventory', 'lot', lotId, 'wasted'],
    queryFn: () => fetchWastedUsageLogs(lotId!) as Promise<UsageLog[]>,
    enabled: lotId !== null,
  });

  return {
    lotInfo: lotQuery.data ?? null,
    usedLogs: usedLogsQuery.data ?? [],
    wastedLogs: wastedLogsQuery.data ?? [],
    loading: lotQuery.isLoading || usedLogsQuery.isLoading || wastedLogsQuery.isLoading,
    error: lotQuery.error || usedLogsQuery.error || wastedLogsQuery.error,
  };
}

export default useInventory;
