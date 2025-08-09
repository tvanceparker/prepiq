// src/interfaces/admin.ts

export type SubscriptionTier = "basic" | "pro" | "master";
export type SubscriptionStatus = "active" | "inactive";

export interface DayHours {
  day:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  open_time?: string; // e.g., "10:00"
  close_time?: string; // e.g., "22:00"
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
  expiry_date?: string; // ISO 8601
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
  onSave: (data: TenantInfoUpdateRequest) => Promise<void>;
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
