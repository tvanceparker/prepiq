import { useQuery } from '@tanstack/react-query';
import { getDailyOverview } from '../../../api/dashboard';
import type { DailyOverviewDTO } from '../../../interfaces/dashboard';

export function useDailyOverview(refreshKey?: any) {
  const { data, isLoading, error } = useQuery<DailyOverviewDTO | null, Error>({
    queryKey: ['dailyOverview', refreshKey],
    queryFn: getDailyOverview,
  });
  return { data: data ?? null, loading: isLoading, error };
}
