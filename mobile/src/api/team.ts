import { get, post, patch, del } from './index';
import type {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  ClockEvent,
  ClockEventCreate,
  ClockEventUpdate,
  ShiftSchedule,
  ShiftScheduleCreate,
  ShiftScheduleUpdate,
  TeamInsightsParams,
  TeamInsightsData,
} from '../interfaces/team';

// =============================================================================
// Employees
// =============================================================================

export const getAllEmployees = async (): Promise<Employee[]> => {
  return get<Employee[]>('/team/employees');
};

export const getEmployee = async (employeeId: number): Promise<Employee> => {
  return get<Employee>(`/team/employees/${employeeId}`);
};

export const createEmployee = async (data: EmployeeCreate): Promise<Employee> => {
  return post<Employee>('/team/employees', data);
};

export const updateEmployee = async (employeeId: number, data: EmployeeUpdate): Promise<Employee> => {
  return patch<Employee>(`/team/employees/${employeeId}`, data);
};

// =============================================================================
// Clock Events
// =============================================================================

export const getClockEvents = async (
  employeeId: number,
  startDate?: string,
  endDate?: string
): Promise<ClockEvent[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  const queryString = params.toString();
  return get<ClockEvent[]>(`/team/clock-events/${employeeId}${queryString ? `?${queryString}` : ''}`);
};

export const createClockEvent = async (data: ClockEventCreate): Promise<ClockEvent> => {
  return post<ClockEvent>('/team/clock-events', data);
};

export const updateClockEvent = async (clockEventId: number, data: ClockEventUpdate): Promise<ClockEvent> => {
  return patch<ClockEvent>(`/team/clock-events/${clockEventId}`, data);
};

// Clock in/out convenience functions
export const clockIn = async (employeeId: number, notes?: string): Promise<ClockEvent> => {
  return post<ClockEvent>('/team/clock-events', {
    employee_id: employeeId,
    clock_in: new Date().toISOString(),
    notes,
  });
};

export const clockOut = async (clockEventId: number, notes?: string): Promise<ClockEvent> => {
  return patch<ClockEvent>(`/team/clock-events/${clockEventId}`, {
    clock_out: new Date().toISOString(),
    notes,
  });
};

// =============================================================================
// Shift Scheduling
// =============================================================================

export const getWeeklySchedule = async (
  startDate: string,
  endDate?: string
): Promise<{ shifts: ShiftSchedule[]; total_hours: number }> => {
  const params = new URLSearchParams({ start_date: startDate });
  if (endDate) params.append('end_date', endDate);
  return get<{ shifts: ShiftSchedule[]; total_hours: number }>(`/team/shifts/weekly?${params.toString()}`);
};

export const getShiftsForEmployee = async (employeeId: number | string): Promise<ShiftSchedule[]> => {
  return get<ShiftSchedule[]>(`/team/shifts/${employeeId}`);
};

export const createScheduledShift = async (data: ShiftScheduleCreate): Promise<ShiftSchedule> => {
  return post<ShiftSchedule>('/team/shifts/schedule', data);
};

export const updateScheduledShift = async (shiftId: number, data: ShiftScheduleUpdate): Promise<ShiftSchedule> => {
  return patch<ShiftSchedule>(`/team/shifts/${shiftId}`, data);
};

export const deleteScheduledShift = async (shiftId: number): Promise<void> => {
  return del<void>(`/team/shifts/${shiftId}`);
};

// =============================================================================
// Team Insights
// =============================================================================

export const getTeamInsights = async (params: TeamInsightsParams): Promise<TeamInsightsData> => {
  const query = new URLSearchParams(params as any).toString();
  return get<TeamInsightsData>(`/team/insights?${query}`);
};

// Legacy exports for backward compatibility
export const createClockEventForEmployee = createClockEvent;
export const getClockEventsForEmployee = (employeeId: string | number) =>
  get(`/team/clock-events/${employeeId}`);
export const updateClockEventForEmployee = (clock_id: string | number, data: any) =>
  patch(`/team/clock-events/${clock_id}`, data);
