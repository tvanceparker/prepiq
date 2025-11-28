// src/hooks/useTeam.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  getClockEvents,
  clockIn,
  clockOut,
  getWeeklySchedule,
  createScheduledShift,
  updateScheduledShift,
  deleteScheduledShift,
  getTeamInsights,
} from '../api/team';
import type {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  ClockEvent,
  ShiftSchedule,
  ShiftScheduleCreate,
  ShiftScheduleUpdate,
  TeamInsightsParams,
  TeamInsightsData,
} from '../interfaces/team';

// =============================================================================
// Employees Hook
// =============================================================================

export function useEmployees() {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery({
    queryKey: ['team', 'employees'],
    queryFn: getAllEmployees,
  });

  const createMutation = useMutation({
    mutationFn: (data: EmployeeCreate) => createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'employees'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmployeeUpdate }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'employees'] });
    },
  });

  // Safely get employees array
  const employees = Array.isArray(employeesQuery.data) ? employeesQuery.data : [];

  // Group by role
  const employeesByRole = employees.reduce((acc, emp) => {
    const role = emp.role_name || 'Unassigned';
    if (!acc[role]) acc[role] = [];
    acc[role].push(emp);
    return acc;
  }, {} as Record<string, Employee[]>);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['team', 'employees'] });
  };

  return {
    employees,
    employeesByRole,
    activeEmployees: employees.filter(e => e.is_active),
    loading: employeesQuery.isLoading,
    error: employeesQuery.error,

    createEmployee: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateEmployee: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Clock Events Hook
// =============================================================================

export interface UseClockEventsOptions {
  employeeId: number;
  startDate?: string;
  endDate?: string;
}

export function useClockEvents(options: UseClockEventsOptions) {
  const queryClient = useQueryClient();
  const { employeeId, startDate, endDate } = options;

  const eventsQuery = useQuery({
    queryKey: ['team', 'clockEvents', employeeId, startDate, endDate],
    queryFn: () => getClockEvents(employeeId, startDate, endDate),
    enabled: Boolean(employeeId),
  });

  const clockInMutation = useMutation({
    mutationFn: ({ employeeId, notes }: { employeeId: number; notes?: string }) =>
      clockIn(employeeId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'clockEvents'] });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ clockEventId, notes }: { clockEventId: number; notes?: string }) =>
      clockOut(clockEventId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'clockEvents'] });
    },
  });

  // Find current open clock event (no clock_out)
  const currentClockEvent = (eventsQuery.data ?? []).find(event => !event.clock_out);

  // Calculate total hours
  const totalHours = (eventsQuery.data ?? []).reduce(
    (sum, event) => sum + (event.duration_hours ?? 0),
    0
  );

  return {
    events: eventsQuery.data ?? [],
    currentClockEvent,
    totalHours,
    loading: eventsQuery.isLoading,
    error: eventsQuery.error,

    clockIn: clockInMutation.mutateAsync,
    clockingIn: clockInMutation.isPending,

    clockOut: clockOutMutation.mutateAsync,
    clockingOut: clockOutMutation.isPending,
  };
}

// =============================================================================
// Shift Schedule Hook
// =============================================================================

export interface UseShiftScheduleOptions {
  startDate: string;
  endDate?: string;
}

export function useShiftSchedule(options: UseShiftScheduleOptions) {
  const queryClient = useQueryClient();
  const { startDate, endDate } = options;

  const scheduleQuery = useQuery({
    queryKey: ['team', 'shifts', startDate, endDate],
    queryFn: () => getWeeklySchedule(startDate, endDate),
    enabled: Boolean(startDate),
  });

  const createMutation = useMutation({
    mutationFn: (data: ShiftScheduleCreate) => createScheduledShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'shifts'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShiftScheduleUpdate }) =>
      updateScheduledShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'shifts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (shiftId: number) => deleteScheduledShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'shifts'] });
    },
  });

  // Group shifts by date
  const shiftsByDate = (scheduleQuery.data?.shifts ?? []).reduce((acc, shift) => {
    if (!acc[shift.shift_date]) acc[shift.shift_date] = [];
    acc[shift.shift_date].push(shift);
    return acc;
  }, {} as Record<string, ShiftSchedule[]>);

  // Group shifts by employee
  const shiftsByEmployee = (scheduleQuery.data?.shifts ?? []).reduce((acc, shift) => {
    const empId = shift.employee_id;
    if (!acc[empId]) acc[empId] = [];
    acc[empId].push(shift);
    return acc;
  }, {} as Record<number, ShiftSchedule[]>);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['team', 'shifts'] });
  };

  return {
    shifts: scheduleQuery.data?.shifts ?? [],
    totalHours: scheduleQuery.data?.total_hours ?? 0,
    shiftsByDate,
    shiftsByEmployee,
    loading: scheduleQuery.isLoading,
    error: scheduleQuery.error,

    createShift: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateShift: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteShift: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,

    refresh,
  };
}

// =============================================================================
// Team Insights Hook
// =============================================================================

export function useTeamInsights(params: TeamInsightsParams) {
  const insightsQuery = useQuery({
    queryKey: ['team', 'insights', params.start_date, params.end_date],
    queryFn: () => getTeamInsights(params),
    enabled: Boolean(params.start_date && params.end_date),
  });

  return {
    insights: insightsQuery.data,
    loading: insightsQuery.isLoading,
    error: insightsQuery.error,
    isRefetching: insightsQuery.isRefetching,
  };
}

export default useEmployees;
