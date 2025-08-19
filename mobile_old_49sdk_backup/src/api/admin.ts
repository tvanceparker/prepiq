import { get, put, post, del, patch } from './index';
import type {
	TenantInfoResponse,
	TenantInfoUpdateRequest,
	ActivityLogResponse,
	RoleWithPermissions,
	RolePermission,
	Employee,
} from '../interfaces/admin';

// Tenant Info
export const getTenantInfo = (): Promise<TenantInfoResponse> => get('/admin/tenant_info');
export const updateTenantInfo = (data: TenantInfoUpdateRequest): Promise<TenantInfoResponse> => put('/admin/tenant_info', data);

// Activity Logs / System Health
export const getActivityLogs = (): Promise<ActivityLogResponse[]> => get('/admin/activity_logs');
export const runSalesDataCheck = () => post('/admin/run_sales_data_check');
export const checkEndOfDayWrites = (checkDate: string) => get(`/admin/check_end_of_day_writes?check_date=${encodeURIComponent(checkDate)}`);

// Roles & Permissions
export const getRolesWithPermissions = (): Promise<RoleWithPermissions[]> => get('/admin/roles-with-permissions');
export const getAllPermissions = (): Promise<RolePermission[]> => get('/admin/permissions');
export const syncRolesAndPermissions = (data: any) => put('/admin/roles/sync', data);
export const deleteRole = (roleId: string | number) => del(`/admin/roles/${roleId}`);
export const getRoles = () => get('/admin/roles');

// Employees
export const createEmployee = (data: any): Promise<Employee> => post('/admin/employees', data);
export const updateEmployee = (employeeId: string | number, data: any): Promise<Employee> => patch(`/admin/employees/${employeeId}`, data);
export const disableEmployee = (employeeId: string | number) => del(`/admin/employees/${employeeId}`);
export const getEmployees = (): Promise<Employee[]> => get('/admin/employees');
