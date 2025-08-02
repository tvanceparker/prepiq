// src/interfaces/adminInterfaces.d.ts

import { DayHours } from "./dayHours";


export interface TenantModalProps {
  visible: boolean;
  onClose: () => void;
  onExited: () => void;
  onSave: (data: TenantInfoUpdateRequest) => Promise<void>;
  initialData: TenantInfoUpdateRequest;
  confirmDelete: boolean;
  setConfirmDelete: React.Dispatch<React.SetStateAction<boolean>>;
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
  subscription_tier: "basic" | "pro" | "master";
  subscription_status: "active" | "inactive";
  expiry_date?: string; // ISO 8601 string date format
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

export interface TenantInfoResponse {
  restaurant_id: number;
  name: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  subscription_tier: "basic" | "pro" | "master";
  subscription_status: "active" | "inactive";
  expiry_date?: string;
  hours_of_operation: DayHours[];
}

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
  created_at: string; // assuming ISO string from backend
}
