import { useState, useEffect, useCallback } from 'react';
import {
  fetchActiveAlerts,
  fetchAllAlerts,
  acknowledgeAlert,
  resolveAlert,
  fixAlert,
} from '../../../api/alerts';
import type { AlertDto, FixAlertPayload } from '../../../interfaces/alerts';

export interface NormalizedAlert extends AlertDto {
  created_at?: string;
  status: string;
  severity: string;
  is_acknowledged: boolean;
  employee_id?: string | number | null;
  role?: string | null;
}

const coerceNullableValue = (value: unknown): string | number | null => {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return String(value);
};

function normalizeAlert(alert: AlertDto): NormalizedAlert {
  return {
    ...alert,
    created_at: alert.date_created ?? alert.created_at,
    status:
      typeof alert.status === 'string'
        ? alert.status.toLowerCase()
        : String(alert.status ?? '').toLowerCase(),
    is_acknowledged: alert.is_acknowledged ?? false,
    severity: alert.severity ? String(alert.severity).toLowerCase() : 'info',
    employee_id: coerceNullableValue(alert.employee_id),
    role:
      alert.role == null ? null : typeof alert.role === 'string' ? alert.role : String(alert.role),
  };
}

const fixableAlertTypes: readonly string[] = [
  'DataQuality:NullOrZeroQuantity',
  'DataQuality:MissingChannel',
  'DataQuality:QuantityOutlier',
];

interface UseAlertsFeedOptions {
  pageSize?: number;
}

export default function useAlertsFeed({ pageSize = 20 }: UseAlertsFeedOptions = {}) {
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [feedMode, setFeedMode] = useState<'active' | 'all'>('active');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchFn = feedMode === 'all' ? fetchAllAlerts : fetchActiveAlerts;
      const dataRaw = await fetchFn(skip, pageSize);
      const data = (dataRaw || []).map(normalizeAlert);
      setAlerts(prev => (skip === 0 ? data : [...prev, ...data]));
      setHasMore(data.length === pageSize);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [feedMode, skip, pageSize]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    setSkip(0);
  }, [feedMode]);

  const loadMore = () => {
    if (!loading && hasMore) setSkip(prev => prev + pageSize);
  };

  const remove = (alertId: string | number) => {
    setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
  };

  const acknowledge = async (alertId: string | number) => {
    try {
      const updatedRaw = await acknowledgeAlert(alertId);
      const updated = normalizeAlert(updatedRaw);
      setAlerts(prev => prev.map(a => (a.alert_id === alertId ? updated : a)));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to acknowledge alert');
    }
  };

  const resolve = async (alertId: string | number) => {
    try {
      const updatedRaw = await resolveAlert(alertId);
      const updated = normalizeAlert(updatedRaw);
      setAlerts(prev => prev.map(a => (a.alert_id === alertId ? updated : a)));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to resolve alert');
    }
  };

  const fix = async (alertId: string | number, fixData: FixAlertPayload) => {
    try {
      // forward to backend; backend may update data, so trigger refetch
      await fixAlert(alertId, fixData);
      setSkip(0);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to fix alert');
    }
  };

  const isFixable = (alert: AlertDto) => fixableAlertTypes.includes(alert.alert_type);

  return {
    alerts,
    loading,
    error,
    hasMore,
    loadMore,
    acknowledge,
    resolve,
    fix,
    isFixable,
    setFeedMode,
    remove,
  } as const;
}
