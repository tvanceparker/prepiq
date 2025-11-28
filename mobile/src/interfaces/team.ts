// src/interfaces/team.ts

export interface Employee {
  employee_id: number;
  restaurant_id: number;
  name: string;
  email: string;
  phone?: string;
  role_id: number;
  role_name?: string;
  is_active: boolean;
  hourly_rate?: number;
  hire_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeCreate {
  name: string;
  email: string;
  phone?: string;
  role_id: number;
  is_active?: boolean;
  hourly_rate?: number;
  hire_date?: string;
  password: string;
}

export interface EmployeeUpdate {
  name?: string;
  email?: string;
  phone?: string;
  role_id?: number;
  is_active?: boolean;
  hourly_rate?: number;
}

export interface ClockEvent {
  clock_event_id: number;
  employee_id: number;
  employee_name?: string;
  clock_in: string;
  clock_out?: string;
  duration_hours?: number;
  notes?: string;
  created_at?: string;
}

export interface ClockEventCreate {
  employee_id: number;
  clock_in: string;
  notes?: string;
}

export interface ClockEventUpdate {
  clock_in?: string;
  clock_out?: string;
  notes?: string;
}

export interface ShiftSchedule {
  shift_id: number;
  employee_id: number;
  employee_name?: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_type: string;
  duration_hours: number;
  notes?: string;
  created_at?: string;
}

export interface ShiftScheduleCreate {
  employee_id: number;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_type: string;
  notes?: string;
}

export interface ShiftScheduleUpdate {
  employee_id?: number;
  shift_date?: string;
  shift_start_time?: string;
  shift_end_time?: string;
  shift_type?: string;
  notes?: string;
}

export interface TeamInsightsParams {
  start_date: string;
  end_date: string;
}

export interface EmployeePerformance {
  employee_id: number;
  employee_name: string;
  total_hours: number;
  total_shifts: number;
  avg_shift_duration: number;
  on_time_percentage: number;
  role: string;
}

export interface TeamInsightsData {
  total_employees: number;
  active_employees: number;
  total_hours_worked: number;
  total_shifts: number;
  avg_hours_per_employee: number;
  total_labor_cost: number;
  avg_cost_per_hour: number;
  labor_cost_percentage: number | null;
  on_time_rate: number;
  late_clock_ins: number;
  missed_shifts: number;
  top_performers: EmployeePerformance[];
  hours_by_day: Record<string, number>;
  shifts_by_type: Record<string, number>;
}

export interface WeeklyScheduleResponse {
  shifts: ShiftSchedule[];
  total_hours: number;
  total_shifts: number;
}

// =============================================================================
// UI/Hook Types (used by team page hooks)
// =============================================================================

export interface ClockSection {
  title: string;
  data: ClockEvent[];
}

export type DateRangeFilter = 'today' | 'week';

export interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  role_id: number;
  hourly_rate: string;
  is_active: boolean;
  password: string;
}

export interface ShiftSection {
  title: string;
  data: ShiftSchedule[];
}

export interface ShiftFormData {
  employee_id: number | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
}

export type DateRangePreset = 'week' | 'month' | 'custom';
