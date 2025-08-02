import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createEmployee,
    updateEmployee,
    disableEmployee,
    getEmployees,
    getRoles,
} from '../../../api/admin.ts';

export function useEmployees() {
    const queryClient = useQueryClient();

    // Fetch employees
    const employeesQuery = useQuery({
        queryKey: ['employees'],
        queryFn: getEmployees,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    // Fetch roles
    const rolesQuery = useQuery({
        queryKey: ['roles'],
        queryFn: getRoles,
        staleTime: 1000 * 60 * 5,
    });

    // Create employee mutation
    const addEmployeeMutation = useMutation({
        mutationFn: createEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
        },
    });

    // Update employee mutation
    const editEmployeeMutation = useMutation({
        mutationFn: ({ employeeId, data }) => updateEmployee(employeeId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
        },
    });

    // Disable employee mutation
    const removeEmployeeMutation = useMutation({
        mutationFn: disableEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries(['employees']);
        },
    });

    return {
        employees: employeesQuery.data ?? [],
        roles: rolesQuery.data ?? [],
        loading: employeesQuery.isLoading || rolesQuery.isLoading,
        error: employeesQuery.error || rolesQuery.error,
        fetchEmployees: employeesQuery.refetch,
        addEmployee: addEmployeeMutation.mutateAsync,
        editEmployee: (employeeId, data) =>
            editEmployeeMutation.mutateAsync({ employeeId, data }),
        removeEmployee: removeEmployeeMutation.mutateAsync,
    };
}
