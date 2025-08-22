import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkEndOfDayWrites, runSalesDataCheck } from '../../../api/admin';

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

export function useSystemHealth(initialDate?: string) {
  const [checkDate, setCheckDate] = useState(initialDate || getYesterday());
  const queryClient = useQueryClient();
  const {
    data,
    error,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['systemHealth', checkDate],
    queryFn: () => checkEndOfDayWrites(checkDate),
    enabled: !!checkDate,
  });
  const salesCheckMutation = useMutation({
    mutationFn: runSalesDataCheck,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['systemHealth', checkDate] }),
  });
  const safeSetCheckDate = useCallback((date: Date | string) => {
    if (date instanceof Date) setCheckDate(date.toISOString().slice(0, 10));
    else if (typeof date === 'string') setCheckDate(date);
  }, []);
  const salesCheckLoading = salesCheckMutation.status === 'pending';
  const salesCheckError = salesCheckMutation.status === 'error';
  return {
    data,
    loading,
    error,
    checkDate,
    setCheckDate: safeSetCheckDate,
    refresh: refetch,
    runSalesCheck: () => salesCheckMutation.mutateAsync(),
    salesCheckLoading,
    salesCheckMessage: salesCheckError
      ? 'Failed to trigger sales data check.'
      : salesCheckLoading
        ? 'Running Sales Data Check...'
        : null,
  };
}
