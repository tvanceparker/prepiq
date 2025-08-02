import { get, put, post, del, patch } from "./index";
import type {
  TenantInfoResponse,
  TenantInfoUpdateRequest,
  ActivityLogResponse,
} from "../interfaces/adminInterfaces";

// ========== Tenant Info ==========
// Get tenant info
export const getTenantInfo = async (): Promise<TenantInfoResponse> => {
  return get("/admin/tenant_info");
};

// Update tenant info
export const updateTenantInfo = async (
  data: TenantInfoUpdateRequest
): Promise<TenantInfoResponse> => {
  return put("/admin/tenant_info", data);
};

// ========== Logs & Checks ==========
export const getActivityLogs = (): Promise<ActivityLogResponse[]> => {
  return get<ActivityLogResponse[]>("/admin/activity_logs");
};

export const runSalesDataCheck = () => post("/admin/run_sales_data_check");
export const checkEndOfDayWrites = (checkDate: string) =>
  get(
    `/admin/check_end_of_day_writes?check_date=${encodeURIComponent(checkDate)}`
  );

// ========== Roles & Permissions ==========
export const getRolesWithPermissions = () =>
  get("/admin/roles-with-permissions");
export const getAllPermissions = () => get("/admin/permissions");
export const syncRolesAndPermissions = (data: any) =>
  put("/admin/roles/sync", data);
export const deleteRole = (roleId: string | number) =>
  del(`/admin/roles/${roleId}`);

// ========== Employee Management ==========
export const createEmployee = (data: any) => post("/admin/employees", data);
export const updateEmployee = (employeeId: string | number, data: any) =>
  patch(`/admin/employees/${employeeId}`, data);
export const disableEmployee = (employeeId: string | number) =>
  del(`/admin/employees/${employeeId}`);
export const getEmployees = () => get("/admin/employees");
export const getRoles = () => get("/admin/roles");
