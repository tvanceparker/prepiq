// src/hooks/usePrep.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPrepSchedule,
  createPrepSchedule,
  updatePrepSchedule,
  deletePrepSchedule,
  markPrepComplete,
  getPrepLogs,
  getBatchRecipes,
  createBatchRecipe,
  updateBatchRecipe,
  deleteBatchRecipe,
  getWasteLogs,
  createWasteLog,
  getIngredients,
} from '../api/prep';
import type {
  PrepScheduleParams,
  PrepScheduleItem,
  PrepScheduleCreate,
  PrepScheduleUpdate,
  PrepLogParams,
  PrepLog,
  WasteLogParams,
  WasteLog,
  WasteLogCreate,
  BatchRecipeData,
} from '../interfaces/prep';

// =============================================================================
// Prep Schedule Hook
// =============================================================================

export function usePrepSchedule(params: PrepScheduleParams = {}) {
  const queryClient = useQueryClient();

  const scheduleQuery = useQuery({
    queryKey: ['prep', 'schedule', params],
    queryFn: () => getPrepSchedule(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: PrepScheduleCreate) => createPrepSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'schedule'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: PrepScheduleUpdate) => updatePrepSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'schedule'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (prepId: number) => deletePrepSchedule(prepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'schedule'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ prepId, quantityPrepped }: { prepId: number; quantityPrepped: number }) =>
      markPrepComplete(prepId, quantityPrepped),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['prep', 'logs'] });
    },
  });

  // Group by status
  const scheduleByStatus = (scheduleQuery.data ?? []).reduce(
    (acc, item) => {
      if (!acc[item.status]) acc[item.status] = [];
      acc[item.status].push(item);
      return acc;
    },
    {} as Record<string, PrepScheduleItem[]>
  );

  // Group by date
  const scheduleByDate = (scheduleQuery.data ?? []).reduce(
    (acc, item) => {
      const date = item.scheduled_date.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    },
    {} as Record<string, PrepScheduleItem[]>
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['prep', 'schedule'] });
  };

  return {
    schedule: scheduleQuery.data ?? [],
    scheduleByStatus,
    scheduleByDate,
    loading: scheduleQuery.isLoading,
    error: scheduleQuery.error,

    createPrep: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updatePrep: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deletePrep: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    completePrep: completeMutation.mutateAsync,
    completing: completeMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Prep Logs Hook
// =============================================================================

export function usePrepLogs(params: PrepLogParams = {}) {
  const logsQuery = useQuery({
    queryKey: ['prep', 'logs', params],
    queryFn: () => getPrepLogs(params),
  });

  // Group by date
  const logsByDate = (logsQuery.data ?? []).reduce(
    (acc, log) => {
      const date = log.prepped_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    },
    {} as Record<string, PrepLog[]>
  );

  // Sections for SectionList
  const sections = Object.entries(logsByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({ title: date, data }));

  return {
    logs: logsQuery.data ?? [],
    logsByDate,
    sections,
    loading: logsQuery.isLoading,
    error: logsQuery.error,
  };
}

// =============================================================================
// Batch Recipes Hook
// =============================================================================

export function useBatchRecipes() {
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ['prep', 'batchRecipes'],
    queryFn: getBatchRecipes,
  });

  const createMutation = useMutation({
    mutationFn: (data: BatchRecipeData) => createBatchRecipe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BatchRecipeData> }) =>
      updateBatchRecipe(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBatchRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['prep', 'batchRecipes'] });
  };

  return {
    recipes: recipesQuery.data ?? [],
    loading: recipesQuery.isLoading,
    error: recipesQuery.error,

    createRecipe: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateRecipe: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteRecipe: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Waste Logs Hook
// =============================================================================

export function useWasteLogs(params: WasteLogParams = {}) {
  const queryClient = useQueryClient();

  const logsQuery = useQuery({
    queryKey: ['prep', 'wasteLogs', params],
    queryFn: () => getWasteLogs(params),
  });

  const createMutation = useMutation({
    mutationFn: (data: WasteLogCreate) => createWasteLog(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep', 'wasteLogs'] });
    },
  });

  // Group by waste type
  const logsByType = (logsQuery.data ?? []).reduce(
    (acc, log) => {
      if (!acc[log.waste_type]) acc[log.waste_type] = [];
      acc[log.waste_type].push(log);
      return acc;
    },
    {} as Record<string, WasteLog[]>
  );

  // Group by date
  const logsByDate = (logsQuery.data ?? []).reduce(
    (acc, log) => {
      const date = log.created_at.split('T')[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    },
    {} as Record<string, WasteLog[]>
  );

  // Calculate total waste by type
  const totalsByType = Object.entries(logsByType).reduce(
    (acc, [type, logs]) => {
      acc[type] = logs.reduce((sum, log) => sum + log.quantity_wasted, 0);
      return acc;
    },
    {} as Record<string, number>
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['prep', 'wasteLogs'] });
  };

  return {
    logs: logsQuery.data ?? [],
    logsByType,
    logsByDate,
    totalsByType,
    loading: logsQuery.isLoading,
    error: logsQuery.error,

    createWasteLog: createMutation.mutateAsync,
    creating: createMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Ingredients Hook (for prep forms)
// =============================================================================

export function usePrepIngredients() {
  const ingredientsQuery = useQuery({
    queryKey: ['prep', 'ingredients'],
    queryFn: getIngredients,
  });

  return {
    ingredients: ingredientsQuery.data ?? [],
    loading: ingredientsQuery.isLoading,
    error: ingredientsQuery.error,
  };
}

export default usePrepSchedule;
