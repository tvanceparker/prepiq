export interface RestaurantSettings {
  forecast_length: number;
  timezone?: string | null;
  eod_run_when_closed: boolean;
  eod_run_after_close_mins: number;
  sales_channels?: string[];
  latitude?: number | null;
  longitude?: number | null;
}

export interface AccountInfo {
  name: string;
  role?: string | null;
  email: string;
  phone?: string | null;
  preferences?: Record<string, any>;
  restaurant_name?: string | null;
  restaurant_latitude?: number | null;
  restaurant_longitude?: number | null;
}

export interface AccountSettingsFormData {
  current_password: string;
  new_email?: string;
  new_phone?: string;
  new_password?: string;
  confirm_password?: string;
  auto_logout_minutes: number;
  theme: 'light' | 'dark';
}

export interface AccountSettingsFormErrors {
  current_password?: string;
  new_email?: string;
  new_phone?: string;
  new_password?: string;
  confirm_password?: string;
  auto_logout_minutes?: string;
  theme?: string;
}

export interface RestaurantSettingsFormData {
  forecast_length: number;
  timezone: string;
  eod_run_when_closed: boolean;
  eod_run_after_close_mins: number;
  sales_channels: string[];
}

export interface RestaurantSettingsFormErrors {
  forecast_length?: string;
  timezone?: string;
  eod_run_when_closed?: string;
  eod_run_after_close_mins?: string;
  sales_channels?: string;
}

export interface LabeledValueProps {
  label: string;
  value: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}
