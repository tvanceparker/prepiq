// src/pages/inventory/hooks/useStockMovements.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getStockMovements } from '../../../api/inventory';
import type { StockMovement } from '../../../interfaces/inventory';

interface MovementSection {
  title: string;
  data: StockMovement[];
}

type DateRange = 'today' | 'week' | 'month';

export function useStockMovements() {
  const queryClient = useQueryClient();

  // UI State
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('week');

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [dateRange]);

  // Fetch movements
  const movementsQuery = useQuery({
    queryKey: ['stockMovements', startDate, endDate],
    queryFn: () => getStockMovements(startDate, endDate),
    enabled: Boolean(startDate && endDate),
  });

  const movements = movementsQuery.data ?? [];

  // Get movement types from data
  const movementTypes = useMemo(() => {
    const types = new Set<string>();
    movements.forEach(m => types.add(m.type));
    return ['all', ...Array.from(types)];
  }, [movements]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    let items = movements;

    if (typeFilter !== 'all') {
      items = items.filter((m: StockMovement) => m.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (m: StockMovement) =>
          m.ingredient_name?.toLowerCase().includes(query) || m.notes?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [movements, typeFilter, searchQuery]);

  // Group by date for sections
  const sections: MovementSection[] = useMemo(() => {
    const grouped: Record<string, StockMovement[]> = {};

    filteredMovements.forEach((movement: StockMovement) => {
      const date = movement.date ? new Date(movement.date).toLocaleDateString() : 'Unknown Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(movement);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([title, data]) => ({ title, data }));
  }, [filteredMovements]);

  // Calculate stats
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let waste = 0;

    movements.forEach((m: StockMovement) => {
      const qty = Math.abs(m.quantity || 0);
      if (m.type === 'Purchase' || m.type === 'Adjustment') {
        totalIn += qty;
      } else if (m.type === 'Sale' || m.type === 'Batch Production') {
        totalOut += qty;
      } else if (m.type === 'Waste') {
        waste += qty;
      }
    });

    return { totalIn, totalOut, waste, count: movements.length };
  }, [movements]);

  // Totals by type
  const totalsByType = useMemo(() => {
    const movementsByType = movements.reduce((acc, movement) => {
      if (!acc[movement.type]) acc[movement.type] = [];
      acc[movement.type].push(movement);
      return acc;
    }, {} as Record<string, StockMovement[]>);

    return Object.entries(movementsByType).reduce((acc, [type, movs]) => {
      acc[type] = movs.reduce((sum, m) => sum + m.quantity, 0);
      return acc;
    }, {} as Record<string, number>);
  }, [movements]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
    setRefreshing(false);
  }, [queryClient]);

  // Movement type styling helper
  const getMovementStyle = useCallback((type: string, qty: number) => {
    // Handle positive quantity types
    if (type === 'Purchase' || type === 'Adjustment' || qty > 0) {
      return { icon: 'arrow-down-bold', color: '#4caf50', bgColor: '#e8f5e9' };
    }
    // Handle negative quantity types
    if (type === 'Sale' || type === 'Batch Production') {
      return { icon: 'arrow-up-bold', color: '#2196f3', bgColor: '#e3f2fd' };
    }
    if (type === 'Waste') {
      return { icon: 'delete-outline', color: '#ff9800', bgColor: '#fff3e0' };
    }
    return { icon: 'swap-horizontal', color: '#9e9e9e', bgColor: '#f5f5f5' };
  }, []);

  return {
    // Data
    movements: filteredMovements,
    allMovements: movements,
    sections,
    stats,
    totalsByType,
    movementTypes,

    // Loading states
    loading: movementsQuery.isLoading,
    refreshing,

    // Filter state
    searchQuery,
    typeFilter,
    dateRange,
    startDate,
    endDate,

    // Actions
    setSearchQuery,
    setTypeFilter,
    setDateRange,
    onRefresh,

    // Helpers
    getMovementStyle,
  };
}

export default useStockMovements;
