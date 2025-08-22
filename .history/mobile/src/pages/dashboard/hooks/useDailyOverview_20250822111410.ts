import { useState, useEffect } from 'react';
import { getDailyOverview } from '../../../api/dashboard';
import type { DailyOverviewDTO } from '../../../interfaces/dashboard';

export function useDailyOverview(refreshKey?: any) {
  const [data, setData] = useState<DailyOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const d = await getDailyOverview();
        setData(d as any);
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);
  return { data, loading, error };
}
