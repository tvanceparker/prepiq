// src/hooks/useInventory.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllInventory,
  fetchInventoryDetails,
  fetchLotInfo,
  fetchUsedUsageLogs,
  fetchWastedUsageLogs,
  adjustInventory,
  getInventoryAdjustments,
} from '../api/inventory';
import type { InventoryItem, LotInfo } from '../interfaces/inventory';

export interface UseInventoryOptions {
  autoRefresh?: boolean;
  refetchInterval?: number;
}

export function useInventory(options: UseInventoryOptions = {}) {
  const queryClient = useQueryClient();
  const { autoRefresh = false, refetchInterval = 60000 } = options;

  // Fetch all inventory
  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: fetchAllInventory,
    refetchInterval: autoRefresh ? refetchInterval : false,
  });

  // Group inventory by category for SectionList
  const inventoryByCategory = (inventoryQuery.data ?? []).reduce(
    (acc, item: any) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, any[]>
  );

  // Get sections for SectionList
  const sections = Object.entries(inventoryByCategory).map(([category, items]) => ({
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

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  return {
    inventory: inventoryQuery.data ?? [],
    inventoryByCategory,
    sections,
    loading: inventoryQuery.isLoading,
    error: inventoryQuery.error,
    isRefetching: inventoryQuery.isRefetching,
    
    adjustInventory: adjustMutation.mutateAsync,
    adjusting: adjustMutation.isPending,
    
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

// Hook for fetching lot information
export function useLotInfo(lotId: number | null) {
  const lotQuery = useQuery({
    queryKey: ['inventory', 'lot', lotId],
    queryFn: () => fetchLotInfo(lotId!),
    enabled: lotId !== null,
  });

  const usedLogsQuery = useQuery({
    queryKey: ['inventory', 'lot', lotId, 'used'],
    queryFn: () => fetchUsedUsageLogs(lotId!),
    enabled: lotId !== null,
  });

  const wastedLogsQuery = useQuery({
    queryKey: ['inventory', 'lot', lotId, 'wasted'],
    queryFn: () => fetchWastedUsageLogs(lotId!),
    enabled: lotId !== null,
  });

  return {
    lotInfo: lotQuery.data,
    usedLogs: usedLogsQuery.data ?? [],
    wastedLogs: wastedLogsQuery.data ?? [],
    loading: lotQuery.isLoading || usedLogsQuery.isLoading || wastedLogsQuery.isLoading,
    error: lotQuery.error || usedLogsQuery.error || wastedLogsQuery.error,
  };
}

export default useInventory;
