import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTenantInfo, updateTenantInfo } from "../../../api/admin.ts";
import { TenantInfo } from "../../../interfaces/adminInterfaces"; // Assuming you put the type here

export default function useTenantInfo() {
  const queryClient = useQueryClient();

  const {
    data: info,
    isLoading: loading,
    error,
  } = useQuery<TenantInfo>({
    queryKey: ["tenantInfo"],
    queryFn: getTenantInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
  });

  const mutation = useMutation({
    mutationFn: updateTenantInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenantInfo"] });
    },
  });

  const saveTenantInfo = async (data: TenantInfo) => {
    return mutation.mutateAsync(data);
  };

  return {
    info,
    loading,
    error,
    saveTenantInfo,
  };
}
