import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchActiveAlerts,
  fetchAllAlerts,
  acknowledgeAlert,
  resolveAlert,
  fixAlert,
} from '../../../api/alerts';

interface AlertItem {
  alert_id: number;
  status: string;
  severity: string;
  alert_type: string;
  title?: string;
  description?: string;
  message?: string;
  is_acknowledged?: boolean;
  meta?: Record<string, unknown>;
}

export default function useAlertsFeed({ pageSize = 20 } = {}) {
  const qc = useQueryClient();
  const [feedMode, setFeedMode] = useState<'active' | 'all'>('active');

  const queryKey = useMemo(() => ['alertsFeed', feedMode, pageSize], [feedMode, pageSize]);

  const fetchPage = async ({ pageParam = 0 }): Promise<AlertItem[]> => {
    const fetchFn = feedMode === 'all' ? fetchAllAlerts : fetchActiveAlerts;
    const raw: any[] = await fetchFn(pageParam, pageSize);
    return raw.map(a => ({
      ...a,
      status: (a.status || '').toLowerCase(),
      severity: (a.severity || 'info').toLowerCase(),
    }));
  };

  const { data, status, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey,
      queryFn: fetchPage,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) =>
        lastPage.length === pageSize ? allPages.length * pageSize : undefined,
    });

  const alerts: AlertItem[] = useMemo(() => {
    const pages = data?.pages || [];
    return ([] as AlertItem[]).concat(...pages);
  }, [data]);

  // Mutations with cache updates so we don't reload the whole list
  type AlertsInfiniteData = { pages: AlertItem[][]; pageParams: any[] } | undefined;

  const ackMutation = useMutation({
    mutationFn: (id: number) => acknowledgeAlert(id),
    onSuccess: (_res, id) => {
      qc.setQueryData<AlertsInfiniteData>(queryKey, old => {
        if (!old) return old;
        const pages = (old.pages || []).map(page =>
          page.map(a => (a.alert_id === id ? { ...a, is_acknowledged: true } : a))
        );
        return { ...old, pages };
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => resolveAlert(id),
    onSuccess: (_res, id) => {
      qc.setQueryData<AlertsInfiniteData>(queryKey, old => {
        if (!old) return old;
        const pages = (old.pages || []).map(page => page.filter(a => a.alert_id !== id));
        return { ...old, pages };
      });
    },
  });

  const fixMutation = useMutation({
    mutationFn: ({ id, fixData }: { id: number; fixData: Record<string, unknown> }) =>
      fixAlert(id, fixData),
    onSuccess: (_res, variables) => {
      qc.setQueryData<AlertsInfiniteData>(queryKey, old => {
        if (!old) return old;
        const pages = (old.pages || []).map(page =>
          page.filter(a => a.alert_id !== variables.id)
        );
        return { ...old, pages };
      });
    },
  });

  const isFixable = (alert: AlertItem) =>
    [
      'DataQuality:NullOrZeroQuantity',
      'DataQuality:MissingChannel',
      'DataQuality:QuantityOutlier',
      'Inventory:DeductionFailed',
    ].includes(alert.alert_type);

  return {
    alerts,
    loading: status === 'pending' || isFetchingNextPage,
    error: (error as any) || null,
    hasMore: !!hasNextPage,
    loadMore: () => fetchNextPage(),
    acknowledge: (id: number) => ackMutation.mutateAsync(id),
    resolve: (id: number) => resolveMutation.mutateAsync(id),
    fix: (id: number, fixData: Record<string, unknown>) =>
      fixMutation.mutateAsync({ id, fixData }),
    isFixable,
    setFeedMode,
    refetch,
  };
}
