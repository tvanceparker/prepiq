import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEmployee, updateEmployee, disableEmployee, getEmployees, getRoles } from '../../../../api/admin';
import type { Employee, RoleWithPermissions } from '../../../../interfaces/admin';

export function useEmployees() {
  const queryClient = useQueryClient();
  const employeesQuery = useQuery<Employee[]>({ queryKey: ['employees'], queryFn: getEmployees, staleTime: 5 * 60 * 1000 });
  const rolesQuery = useQuery<RoleWithPermissions[]>({ queryKey: ['roles'], queryFn: getRoles, staleTime: 5 * 60 * 1000 });
  const addEmployeeMutation = useMutation({ mutationFn: createEmployee, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }) });
  const editEmployeeMutation = useMutation({ mutationFn: ({ employeeId, data }: { employeeId: number | string; data: any }) => updateEmployee(employeeId, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }) });
  const removeEmployeeMutation = useMutation({ mutationFn: (employeeId: number | string) => disableEmployee(employeeId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }) });
  return { employees: employeesQuery.data || [], roles: rolesQuery.data || [], loading: employeesQuery.isLoading || rolesQuery.isLoading, error: employeesQuery.error || rolesQuery.error, fetchEmployees: employeesQuery.refetch, addEmployee: addEmployeeMutation.mutateAsync, editEmployee: (employeeId: number | string, data: any) => editEmployeeMutation.mutateAsync({ employeeId, data }), removeEmployee: (employeeId: number | string) => removeEmployeeMutation.mutateAsync(employeeId) };
}
