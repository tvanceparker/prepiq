// Mobile admin interfaces (ported from web frontend)

export type SubscriptionTier = 'basic' | 'pro' | 'master';
export type SubscriptionStatus = 'active' | 'inactive';

export interface DayHours {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  open_time?: string;
  close_time?: string;
  is_closed: boolean;
}

export interface TenantInfo {
  restaurant_id: number;
  name: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  expiry_date?: string;
  hours_of_operation: DayHours[];
}

export interface TenantInfoUpdateRequest {
  name: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  hours_of_operation: DayHours[];
}

export interface TenantInfoResponse extends TenantInfo {}

export interface TenantModalProps {
  visible: boolean;
  onClose: () => void;
  onExited?: () => void;
  onSave: (data: TenantInfoUpdateRequest) => Promise<void> | void;
  initialData: TenantInfoUpdateRequest;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
}

export interface ActivityLogResponse {
  activity_id: number;
  employee_id?: number;
  employee_name?: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface RolePermission {
  permission_id: number;
  name: string;
  description?: string;
}

export interface RoleWithPermissions {
  role_id: number | null;
  name: string;
  description?: string;
  permissions?: RolePermission[];
  permission_names?: string[]; // local editing convenience
}

export interface Employee {
  employee_id: number;
  name: string;
  email: string;
  username: string;
  phone?: string;
  pay_rate?: number;
  employment_type?: string;
  role_id: number;
  is_active: boolean;
}
// (duplicates below removed)
