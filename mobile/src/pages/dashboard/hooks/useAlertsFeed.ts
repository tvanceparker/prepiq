import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveAlerts,
  fetchAllAlerts,
  acknowledgeAlert,
  resolveAlert,
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
}

export default function useAlertsFeed({ pageSize = 20 } = {}) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
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
      const raw: any[] = await fetchFn(skip, pageSize);
      const data = raw.map(a => ({
        ...a,
        status: (a.status || '').toLowerCase(),
        severity: (a.severity || 'info').toLowerCase(),
      }));
      setAlerts(prev => (skip === 0 ? data : [...prev, ...data]));
      setHasMore(data.length === pageSize);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch alerts');
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
    if (!loading && hasMore) setSkip(p => p + pageSize);
  };
  const acknowledge = async (id: number) => {
    try {
      const updated = await acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => (a.alert_id === id ? { ...a, ...updated } : a)));
    } catch (e: any) {
      setError(e.message || 'Ack failed');
    }
  };
  const resolve = async (id: number) => {
    try {
      const updated = await resolveAlert(id);
      setAlerts(prev => prev.map(a => (a.alert_id === id ? { ...a, ...updated } : a)));
    } catch (e: any) {
      setError(e.message || 'Resolve failed');
    }
  };
  return { alerts, loading, error, hasMore, loadMore, acknowledge, resolve, setFeedMode };
}
