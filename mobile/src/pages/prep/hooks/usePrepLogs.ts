// src/pages/prep/hooks/usePrepLogs.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPrepLogs, getBatchRecipes } from '../../../api/prep';
import type { PrepLog, PrepLogParams, BatchRecipe } from '../../../interfaces/prep';

type PrepStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | '';

interface PrepLogSection {
  title: string;
  data: PrepLog[];
}

export function usePrepLogs() {
  const queryClient = useQueryClient();

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<PrepStatus>('');
  const [batchRecipeFilter, setBatchRecipeFilter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Build query params
  const queryParams: PrepLogParams = useMemo(() => {
    const params: PrepLogParams = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (statusFilter) params.status = statusFilter;
    if (batchRecipeFilter) params.batch_recipe_id = batchRecipeFilter;
    return params;
  }, [startDate, endDate, statusFilter, batchRecipeFilter]);

  // Fetch prep logs
  const logsQuery = useQuery({
    queryKey: ['prep', 'logs', queryParams],
    queryFn: () => getPrepLogs(queryParams),
  });

  // Fetch batch recipes for filter dropdown
  const recipesQuery = useQuery({
    queryKey: ['prep', 'batchRecipes'],
    queryFn: getBatchRecipes,
  });

  const logs = logsQuery.data ?? [];
  const batchRecipes = (recipesQuery.data ?? []) as BatchRecipe[];

  // Apply local search filter
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      log =>
        log.batch_recipe_name?.toLowerCase().includes(query) ||
        log.assigned_employee_name?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // Group by date for SectionList
  const sections: PrepLogSection[] = useMemo(() => {
    const grouped: Record<string, PrepLog[]> = {};

    filteredLogs.forEach(log => {
      const dateKey = log.prep_date ? new Date(log.prep_date).toLocaleDateString() : 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(log);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([title, data]) => ({ title, data }));
  }, [filteredLogs]);

  // Calculate stats
  const stats = useMemo(() => {
    const completed = filteredLogs.filter(l => l.status === 'completed').length;
    const inProgress = filteredLogs.filter(l => l.status === 'in_progress').length;
    const scheduled = filteredLogs.filter(l => l.status === 'scheduled').length;
    const cancelled = filteredLogs.filter(l => l.status === 'cancelled').length;
    return { completed, inProgress, scheduled, cancelled, total: filteredLogs.length };
  }, [filteredLogs]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['prep', 'logs'] });
    setRefreshing(false);
  }, [queryClient]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setBatchRecipeFilter(null);
    setSearchQuery('');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(
    () => !!(startDate || endDate || statusFilter || batchRecipeFilter || searchQuery),
    [startDate, endDate, statusFilter, batchRecipeFilter, searchQuery]
  );

  // Status color helper
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'in_progress':
        return '#ff9800';
      case 'scheduled':
        return '#2196f3';
      case 'cancelled':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  }, []);

  // Status background color helper
  const getStatusBgColor = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return '#e8f5e9';
      case 'in_progress':
        return '#fff3e0';
      case 'scheduled':
        return '#e3f2fd';
      case 'cancelled':
        return '#ffebee';
      default:
        return '#f5f5f5';
    }
  }, []);

  // Check if expiry date is approaching or past
  const getExpiryStatus = useCallback((expiryDate: string | null) => {
    if (!expiryDate) return null;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: '#f44336' };
    if (diffDays <= 3) return { label: `${diffDays}d left`, color: '#ff9800' };
    return { label: `${diffDays}d`, color: '#4caf50' };
  }, []);

  // Format date helper
  const formatDate = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  return {
    // Data
    logs: filteredLogs,
    allLogs: logs,
    sections,
    stats,
    batchRecipes,

    // Loading states
    loading: logsQuery.isLoading,
    refreshing,
    recipesLoading: recipesQuery.isLoading,
    error: logsQuery.error,

    // Filter state
    startDate,
    endDate,
    statusFilter,
    batchRecipeFilter,
    searchQuery,
    hasActiveFilters,

    // Actions
    setStartDate,
    setEndDate,
    setStatusFilter,
    setBatchRecipeFilter,
    setSearchQuery,
    onRefresh,
    clearFilters,

    // Helpers
    getStatusColor,
    getStatusBgColor,
    getExpiryStatus,
    formatDate,
  };
}

export default usePrepLogs;
