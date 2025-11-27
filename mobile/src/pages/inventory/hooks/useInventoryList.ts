// src/pages/inventory/hooks/useInventoryList.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllInventory,
  fetchLotInfo,
  fetchUsedUsageLogs,
  fetchWastedUsageLogs,
} from '../../../api/inventory';
import type { InventoryItem, LotInfo, UsageLog, LotBreakdown } from '../../../interfaces/inventory';

interface UseInventoryListOptions {
  autoRefresh?: boolean;
  refetchInterval?: number;
}

interface InventorySection {
  title: string;
  data: InventoryItem[];
}

export function useInventoryList(options: UseInventoryListOptions = {}) {
  const queryClient = useQueryClient();
  const { autoRefresh = false, refetchInterval = 60000 } = options;

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showLotDetailModal, setShowLotDetailModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all inventory
  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'all'],
    queryFn: fetchAllInventory,
    refetchInterval: autoRefresh ? refetchInterval : false,
  });

  // Fetch lot info when a lot is selected
  const lotQuery = useQuery({
    queryKey: ['inventory', 'lot', selectedLotId],
    queryFn: () => fetchLotInfo(selectedLotId!) as Promise<LotInfo>,
    enabled: selectedLotId !== null,
  });

  const usedLogsQuery = useQuery({
    queryKey: ['inventory', 'lot', selectedLotId, 'used'],
    queryFn: () => fetchUsedUsageLogs(selectedLotId!) as Promise<UsageLog[]>,
    enabled: selectedLotId !== null,
  });

  const wastedLogsQuery = useQuery({
    queryKey: ['inventory', 'lot', selectedLotId, 'wasted'],
    queryFn: () => fetchWastedUsageLogs(selectedLotId!) as Promise<UsageLog[]>,
    enabled: selectedLotId !== null,
  });

  // Cast data
  const inventory = (inventoryQuery.data ?? []) as unknown as InventoryItem[];

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [inventory]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    let items = inventory;

    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => item.ingredient_name?.toLowerCase().includes(query));
    }

    return items;
  }, [inventory, categoryFilter, searchQuery]);

  // Group by category for SectionList
  const sections: InventorySection[] = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};

    filteredInventory.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredInventory]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['inventory'] });
    setRefreshing(false);
  }, [queryClient]);

  // Open lot breakdown modal
  const handleViewLots = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setShowLotModal(true);
  }, []);

  // Open lot detail modal
  const handleViewLotDetail = useCallback((lotId: number) => {
    setSelectedLotId(lotId);
    setShowLotDetailModal(true);
  }, []);

  // Close lot modal
  const closeLotModal = useCallback(() => {
    setShowLotModal(false);
  }, []);

  // Close lot detail modal
  const closeLotDetailModal = useCallback(() => {
    setShowLotDetailModal(false);
    setSelectedLotId(null);
  }, []);

  // Stock level indicator helper
  const getStockLevel = useCallback((quantity: number, reorderPoint: number = 10) => {
    if (quantity <= 0) return { color: '#f44336', label: 'Out of Stock', icon: 'alert-circle' };
    if (quantity <= reorderPoint) return { color: '#ff9800', label: 'Low Stock', icon: 'alert' };
    return { color: '#4caf50', label: 'In Stock', icon: 'check-circle' };
  }, []);

  // Format date helper
  const formatDate = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  }, []);

  return {
    // Data
    inventory,
    sections,
    categories,
    filteredInventory,

    // Loading states
    loading: inventoryQuery.isLoading,
    refreshing,
    lotLoading: lotQuery.isLoading || usedLogsQuery.isLoading || wastedLogsQuery.isLoading,

    // Lot data
    selectedItem,
    selectedLotId,
    lotInfo: lotQuery.data ?? null,
    usedLogs: usedLogsQuery.data ?? [],
    wastedLogs: wastedLogsQuery.data ?? [],

    // Modal states
    showLotModal,
    showLotDetailModal,

    // Filter state
    searchQuery,
    categoryFilter,

    // Actions
    setSearchQuery,
    setCategoryFilter,
    onRefresh,
    handleViewLots,
    handleViewLotDetail,
    closeLotModal,
    closeLotDetailModal,

    // Helpers
    getStockLevel,
    formatDate,
  };
}

export default useInventoryList;
