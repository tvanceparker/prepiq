// src/pages/prep/hooks/usePrepSchedule.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPrepSchedule,
  createPrepSchedule,
  updatePrepSchedule,
  deletePrepSchedule,
  getBatchRecipes,
} from '../../../api/prep';
import type {
  PrepScheduleParams,
  PrepScheduleItem,
  PrepScheduleCreate,
  PrepScheduleUpdate,
  BatchRecipe,
} from '../../../interfaces/prep';

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

  // Group by status
  const scheduleByStatus = (scheduleQuery.data ?? []).reduce((acc, item) => {
    if (!acc[item.status]) acc[item.status] = [];
    acc[item.status].push(item);
    return acc;
  }, {} as Record<string, PrepScheduleItem[]>);

  // Group by date
  const scheduleByDate = (scheduleQuery.data ?? []).reduce((acc, item) => {
    const date = item.scheduled_date.split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, PrepScheduleItem[]>);

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

    refresh,
    refetch: scheduleQuery.refetch,
  };
}

// =============================================================================
// Batch Recipes for Prep Schedule (simplified)
// =============================================================================

export function useBatchRecipesForSchedule() {
  const recipesQuery = useQuery({
    queryKey: ['prep', 'batchRecipes'],
    queryFn: getBatchRecipes,
  });

  return {
    recipes: (recipesQuery.data ?? []) as BatchRecipe[],
    loading: recipesQuery.isLoading,
    error: recipesQuery.error,
  };
}
