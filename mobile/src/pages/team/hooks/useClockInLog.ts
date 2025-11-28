// src/pages/team/hooks/useClockInLog.ts
import { useState, useMemo, useCallback, useContext } from 'react';
import { useClockEvents, useEmployees } from '../../../hooks/useTeam';
import { AuthContext } from '../../../contexts/AuthContext';
import type { ClockEvent, Employee } from '../../../interfaces/team';

export interface ClockSection {
  title: string;
  data: ClockEvent[];
}

export type DateRangeFilter = 'today' | 'week';

export function useClockInLog() {
  const { user } = useContext(AuthContext) || {};
  const currentEmployeeId = user?.user_id || 0;

  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeFilter>('today');
  const [showClockDialog, setShowClockDialog] = useState(false);

  // Calculate date range based on filter
  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date();

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [dateRange]);

  const { startDate, endDate } = getDateRange();

  // Queries & mutations from the shared hook
  const {
    events: clockEvents = [],
    loading,
    clockIn,
    clockingIn,
    clockOut,
    clockingOut,
    currentClockEvent,
    totalHours: workedHours,
  } = useClockEvents({ employeeId: currentEmployeeId, startDate, endDate });

  const { employees = [] } = useEmployees();

  // Check if current user is clocked in
  const isClockedIn = Boolean(currentClockEvent && !currentClockEvent.clock_out);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      currentlyIn: isClockedIn ? 1 : 0,
      totalEvents: clockEvents.length,
      totalHours: workedHours.toFixed(1),
    };
  }, [clockEvents, isClockedIn, workedHours]);

  // Group events by date for SectionList
  const sections: ClockSection[] = useMemo(() => {
    const grouped: Record<string, ClockEvent[]> = {};

    clockEvents.forEach((event: ClockEvent) => {
      const date = event.clock_in?.split('T')[0] || 'Unknown Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([title, data]) => ({
        title: new Date(title).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        data,
      }));
  }, [clockEvents]);

  // Get employee name by ID
  const getEmployeeName = useCallback(
    (employeeId: number) => {
      const emp = employees.find((e: Employee) => e.employee_id === employeeId);
      return emp?.name || 'Unknown';
    },
    [employees]
  );

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The hook will auto-refresh via query invalidation
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Handle clock in/out
  const handleClock = useCallback(
    async (type: 'clock_in' | 'clock_out') => {
      if (!currentEmployeeId) return;

      try {
        if (type === 'clock_in') {
          await clockIn({ employeeId: currentEmployeeId });
        } else if (currentClockEvent) {
          await clockOut({ clockEventId: currentClockEvent.clock_event_id });
        }
        setShowClockDialog(false);
      } catch (error) {
        console.error('Clock action failed:', error);
      }
    },
    [currentEmployeeId, currentClockEvent, clockIn, clockOut]
  );

  // Format time for display
  const formatTime = useCallback((dateStr: string | undefined | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return {
    // State
    currentEmployeeId,
    dateRange,
    showClockDialog,
    refreshing,

    // Data
    clockEvents,
    sections,
    stats,
    isClockedIn,
    currentClockEvent,
    loading,
    clockingIn,
    clockingOut,

    // Actions
    setDateRange,
    setShowClockDialog,
    onRefresh,
    handleClock,

    // Helpers
    getEmployeeName,
    formatTime,
  };
}

export default useClockInLog;
