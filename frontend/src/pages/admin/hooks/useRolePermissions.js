import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getRolesWithPermissions,
    getAllPermissions,
    syncRolesAndPermissions,
    deleteRole,
} from '../../../api/admin.ts';

export function useRolePermissions() {
    const queryClient = useQueryClient();

    // Fetch roles with permissions
    const rolesQuery = useQuery({
        queryKey: ['roles'],
        queryFn: getRolesWithPermissions,
    });

    // Fetch all permissions
    const permissionsQuery = useQuery({
        queryKey: ['permissions'],
        queryFn: getAllPermissions,
    });

    // Mutation for syncing roles and deleted roles
    const syncMutation = useMutation({
        mutationFn: ({ roles, deleted_roles }) =>
            syncRolesAndPermissions({ roles, deleted_roles }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });

    // Mutation for deleting a role by ID
    const deleteMutation = useMutation({
        mutationFn: (roleId) => deleteRole(roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });

    return {
        roles: rolesQuery.data || [],
        permissions: permissionsQuery.data || [],
        loading: rolesQuery.isLoading || permissionsQuery.isLoading || syncMutation.isLoading || deleteMutation.isLoading,
        error: rolesQuery.error || permissionsQuery.error || syncMutation.error || deleteMutation.error,
        syncData: (roles, deleted_roles) => syncMutation.mutateAsync({ roles, deleted_roles }),
        deleteRole: (roleId) => deleteMutation.mutateAsync(roleId),
    };
}
