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
