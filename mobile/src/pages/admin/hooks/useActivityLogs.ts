import { useQuery } from '@tanstack/react-query';
import client from '../../../api/client';

export interface ActivityLogResponse {
  activity_id: number;
  employee_name?: string;
  employee_id?: number;
  action: string;
  details?: string;
  created_at: string;
}

export function useAdminActivityLogs() {
  return useQuery<ActivityLogResponse[]>({
    queryKey: ['activityLogs'],
    queryFn: async () => (await client.get('/admin/activity-logs')).data,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
