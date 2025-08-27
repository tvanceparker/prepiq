import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTenantInfo, updateTenantInfo } from '../../../api/admin';
import type { TenantInfoResponse, TenantInfoUpdateRequest } from '../../../interfaces/admin';

export default function useTenantInfo() {
  const queryClient = useQueryClient();
  const {
    data: info,
    isLoading: loading,
  isFetching,
    error,
  refetch,
  } = useQuery<TenantInfoResponse>({
    queryKey: ['tenantInfo'],
    queryFn: getTenantInfo,
    staleTime: 5 * 60 * 1000,
  });
  const mutation = useMutation({
    mutationFn: (data: TenantInfoUpdateRequest) => updateTenantInfo(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tenantInfo'] }),
  });
  return {
    info,
    loading,
  isFetching,
    error,
  refetch,
    saveTenantInfo: (data: TenantInfoUpdateRequest) => mutation.mutateAsync(data),
  };
}
