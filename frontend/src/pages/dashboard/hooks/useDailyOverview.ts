import { useState, useEffect } from 'react';
import { getDailyOverview } from '../../../api/dashboard';
import type { DailyOverviewDTO } from '../../../interfaces/dashboardInterfaceFrontend';

export function useDailyOverview() {
  const [data, setData] = useState<DailyOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const overviewData = await getDailyOverview();
        setData(overviewData as any);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOverview();
  }, []);

  return { data, loading, error };
}
