// src/pages/team/hooks/useTeamInsightsPage.ts
import { useState, useMemo, useCallback } from 'react';
import { useEmployees, useTeamInsights } from '../../../hooks/useTeam';
import type { Employee, TeamInsightsData } from '../../../interfaces/team';

export type DateRangePreset = 'week' | 'month' | 'custom';

export function useTeamInsightsPage() {
  // Get current week date range by default
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const [datePreset, setDatePreset] = useState<DateRangePreset>('week');
  const [startDate, setStartDate] = useState(startOfWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(endOfWeek.toISOString().split('T')[0]);

  // Queries
  const { employees = [], loading: loadingEmployees } = useEmployees();
  const { insights, loading: loadingInsights, isRefetching } = useTeamInsights({
    start_date: startDate,
    end_date: endDate,
  });

  const loading = loadingEmployees || loadingInsights;

  // Derived stats
  const stats = useMemo(() => {
    const activeEmployees = employees.filter((e: Employee) => e.is_active).length;
    const totalEmployees = employees.length;

    return {
      activeEmployees,
      totalEmployees,
      totalHours: insights?.total_hours_worked?.toFixed(1) || '0',
      avgHoursPerEmployee: insights?.avg_hours_per_employee?.toFixed(1) || '0',
      totalLaborCost: insights?.total_labor_cost?.toFixed(2) || '0.00',
      avgCostPerHour: insights?.avg_cost_per_hour?.toFixed(2) || '0.00',
      totalShifts: insights?.total_shifts || 0,
      onTimeRate: insights?.on_time_rate?.toFixed(1) || '0',
      lateClockIns: insights?.late_clock_ins || 0,
    };
  }, [employees, insights]);

  // Top performers
  const topPerformers = useMemo(() => {
    return insights?.top_performers || [];
  }, [insights]);

  // Hours by day chart data
  const hoursByDay = useMemo(() => {
    if (!insights?.hours_by_day) return [];
    return Object.entries(insights.hours_by_day)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hours]) => ({
        date,
        hours,
        label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      }));
  }, [insights]);

  // Shifts by type
  const shiftsByType = useMemo(() => {
    if (!insights?.shifts_by_type) return [];
    return Object.entries(insights.shifts_by_type).map(([type, count]) => ({
      type: type.replace('_', ' ').toUpperCase(),
      count,
    }));
  }, [insights]);

  // Date range presets
  const setLastWeek = useCallback(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 7);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setDatePreset('week');
  }, []);

  const setLastMonth = useCallback(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setDatePreset('month');
  }, []);

  const setThisWeek = useCallback(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setDatePreset('week');
  }, []);

  // Format hours for display
  const formatHours = useCallback((mins?: number) => {
    if (!mins) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }, []);

  // Get date range display text
  const dateRangeText = useMemo(() => {
    const start = new Date(startDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  }, [startDate, endDate]);

  return {
    // State
    datePreset,
    startDate,
    endDate,

    // Data
    insights,
    stats,
    topPerformers,
    hoursByDay,
    shiftsByType,
    loading,
    isRefetching,

    // Display
    dateRangeText,

    // Actions
    setStartDate,
    setEndDate,
    setLastWeek,
    setLastMonth,
    setThisWeek,

    // Helpers
    formatHours,
  };
}

export default useTeamInsightsPage;
