import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRolesWithPermissions, getAllPermissions, syncRolesAndPermissions, deleteRole } from '../../../../api/admin';
import type { RoleWithPermissions, RolePermission } from '../../../../interfaces/admin';

export function useRolePermissions() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery<RoleWithPermissions[]>({ queryKey: ['roles'], queryFn: getRolesWithPermissions });
  const permissionsQuery = useQuery<RolePermission[]>({ queryKey: ['permissions'], queryFn: getAllPermissions });
  const syncMutation = useMutation({ mutationFn: ({ roles, deleted_roles }: any) => syncRolesAndPermissions({ roles, deleted_roles }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }) });
  const deleteMutation = useMutation({ mutationFn: (roleId: number | string) => deleteRole(roleId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }) });
  return { roles: rolesQuery.data || [], permissions: permissionsQuery.data || [], loading: rolesQuery.isLoading || permissionsQuery.isLoading || syncMutation.isLoading || deleteMutation.isLoading, error: rolesQuery.error || permissionsQuery.error || syncMutation.error || deleteMutation.error, syncData: (roles: any, deleted_roles: any) => syncMutation.mutateAsync({ roles, deleted_roles }), deleteRole: (roleId: number | string) => deleteMutation.mutateAsync(roleId) };
}
