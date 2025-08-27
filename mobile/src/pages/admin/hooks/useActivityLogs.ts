import { useQuery } from '@tanstack/react-query';
import { getActivityLogs } from '../../../api/admin';
import type { ActivityLogResponse } from '../../../interfaces/admin';

export function useAdminActivityLogs() {
  return useQuery<ActivityLogResponse[]>({
    queryKey: ['activityLogs'],
    queryFn: getActivityLogs, // Uses /admin/activity_logs
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
