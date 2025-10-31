import { api } from './index';

// ====================== Employees ======================

export const getAllEmployees = async () => {
  const response = await api.get('/team/employees');
  return response.data;
};

export const createEmployee = async (employeeData: any) => {
  const response = await api.post('/team/employees', employeeData);
  return response.data;
};

export const updateEmployee = async (employeeId: number, employeeData: any) => {
  const response = await api.patch(`/team/employees/${employeeId}`, employeeData);
  return response.data;
};

// ====================== Clock Events ======================

export const getClockEvents = async (employeeId: number, startDate?: string, endDate?: string) => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await api.get(`/team/clock-events/${employeeId}?${params.toString()}`);
  return response.data;
};

export const createClockEvent = async (clockEventData: any) => {
  const response = await api.post('/team/clock-events', clockEventData);
  return response.data;
};

export const updateClockEvent = async (clockEventId: number, updateData: any) => {
  const response = await api.patch(`/team/clock-events/${clockEventId}`, updateData);
  return response.data;
};

// ====================== Shift Scheduling ======================

export interface ShiftScheduleData {
  employee_id: number;
  shift_date: string; // YYYY-MM-DD
  shift_start_time: string; // HH:MM
  shift_end_time: string; // HH:MM
  shift_type: string;
}

export interface ShiftScheduleResponse {
  shift_id: number;
  employee_id: number;
  employee_name: string;
  shift_date: string;
  shift_start_time: string;
  shift_end_time: string;
  shift_type: string;
  duration_hours: number;
}

export const getWeeklySchedule = async (startDate: string, endDate?: string) => {
  const params = new URLSearchParams({ start_date: startDate });
  if (endDate) params.append('end_date', endDate);

  const response = await api.get(`/team/shifts/weekly?${params.toString()}`);
  return response.data;
};

export const createScheduledShift = async (shiftData: ShiftScheduleData) => {
  const response = await api.post('/team/shifts/schedule', shiftData);
  return response.data;
};

export const updateScheduledShift = async (shiftId: number, shiftData: ShiftScheduleData) => {
  const response = await api.patch(`/team/shifts/${shiftId}`, shiftData);
  return response.data;
};

export const deleteScheduledShift = async (shiftId: number) => {
  const response = await api.delete(`/team/shifts/${shiftId}`);
  return response.data;
};

// ====================== Team Insights ======================

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

export const getTeamInsights = async (params: TeamInsightsParams) => {
  const query = new URLSearchParams(params as any).toString();
  const response = await api.get(`/team/insights?${query}`);
  return response.data;
};
