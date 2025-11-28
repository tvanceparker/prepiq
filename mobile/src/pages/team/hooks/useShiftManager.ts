// src/pages/team/hooks/useShiftManager.ts
import { useState, useMemo, useCallback } from 'react';
import { useEmployees, useShiftSchedule } from '../../../hooks/useTeam';
import type {
  Employee,
  ShiftSchedule,
  ShiftScheduleCreate,
  ShiftSection,
  ShiftFormData,
} from '../../../interfaces/team';

const SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night', 'full_day', 'regular'];

export function useShiftManager() {
  // Week calculation
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftSchedule | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>({
    employee_id: null,
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    shift_type: 'regular',
  });
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Calculate week end
  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(currentWeekStart.getDate() + 6);
    return end;
  }, [currentWeekStart]);

  // Queries
  const { employees = [], loading: loadingEmployees } = useEmployees();
  const {
    shifts = [],
    loading: loadingShifts,
    createShift,
    creating,
    updateShift,
    updating,
    deleteShift,
    deleting,
    refresh,
  } = useShiftSchedule({
    startDate: currentWeekStart.toISOString().split('T')[0],
    endDate: currentWeekEnd.toISOString().split('T')[0],
  });

  const loading = loadingEmployees || loadingShifts;

  // Group shifts by date for SectionList
  const sections: ShiftSection[] = useMemo(() => {
    const grouped = shifts.reduce((acc, shift) => {
      const date = shift.shift_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(shift);
      return acc;
    }, {} as Record<string, ShiftSchedule[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        title: new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        data,
      }));
  }, [shifts]);

  // Get employee name by ID
  const getEmployeeName = useCallback(
    (employeeId: number) => {
      const emp = employees.find((e: Employee) => e.employee_id === employeeId);
      return emp?.name || `Employee #${employeeId}`;
    },
    [employees]
  );

  // Week navigation
  const goToPreviousWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() - 7);
      return newStart;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart(prev => {
      const newStart = new Date(prev);
      newStart.setDate(prev.getDate() + 7);
      return newStart;
    });
  }, []);

  const goToCurrentWeek = useCallback(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1);
    setCurrentWeekStart(start);
  }, []);

  // Open create dialog
  const openCreate = useCallback(() => {
    setEditingShift(null);
    setFormData({
      employee_id: null,
      shift_date: currentWeekStart.toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'regular',
    });
    setDialogOpen(true);
  }, [currentWeekStart]);

  // Open edit dialog
  const openEdit = useCallback((shift: ShiftSchedule) => {
    setEditingShift(shift);
    setFormData({
      employee_id: shift.employee_id,
      shift_date: shift.shift_date,
      start_time: shift.shift_start_time,
      end_time: shift.shift_end_time,
      shift_type: shift.shift_type || 'regular',
    });
    setDialogOpen(true);
  }, []);

  // Close dialog
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setEditingShift(null);
  }, []);

  // Handle save (create or update)
  const handleSave = useCallback(async () => {
    if (!formData.employee_id) {
      setSnackbar({ visible: true, message: 'Please select an employee' });
      return;
    }

    try {
      const data: ShiftScheduleCreate = {
        employee_id: formData.employee_id,
        shift_date: formData.shift_date,
        shift_start_time: formData.start_time,
        shift_end_time: formData.end_time,
        shift_type: formData.shift_type,
      };

      if (editingShift) {
        await updateShift({ id: editingShift.shift_id, data });
        setSnackbar({ visible: true, message: 'Shift updated successfully' });
      } else {
        await createShift(data);
        setSnackbar({ visible: true, message: 'Shift created successfully' });
      }
      closeDialog();
    } catch (error) {
      setSnackbar({
        visible: true,
        message: editingShift ? 'Failed to update shift' : 'Failed to create shift',
      });
    }
  }, [formData, editingShift, createShift, updateShift, closeDialog]);

  // Handle delete
  const handleDelete = useCallback(
    async (shiftId: number) => {
      try {
        await deleteShift(shiftId);
        setSnackbar({ visible: true, message: 'Shift deleted' });
      } catch (error) {
        setSnackbar({ visible: true, message: 'Failed to delete shift' });
      }
    },
    [deleteShift]
  );

  // Update form field
  const updateFormField = useCallback(
    <K extends keyof ShiftFormData>(field: K, value: ShiftFormData[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  // Get shift type color
  const getShiftTypeColor = useCallback((shiftType: string) => {
    switch (shiftType) {
      case 'morning':
        return '#ff9800';
      case 'afternoon':
        return '#2196f3';
      case 'evening':
        return '#9c27b0';
      case 'night':
        return '#3f51b5';
      case 'full_day':
        return '#4caf50';
      default:
        return '#757575';
    }
  }, []);

  // Format week display
  const weekDisplayText = useMemo(() => {
    const startStr = currentWeekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const endStr = currentWeekEnd.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  }, [currentWeekStart, currentWeekEnd]);

  // Dismiss snackbar
  const dismissSnackbar = useCallback(() => {
    setSnackbar(s => ({ ...s, visible: false }));
  }, []);

  return {
    // State
    dialogOpen,
    editingShift,
    formData,
    snackbar,

    // Data
    shifts,
    sections,
    employees,
    loading,
    creating,
    updating,
    deleting,
    currentWeekStart,
    currentWeekEnd,
    weekDisplayText,
    SHIFT_TYPES,

    // Actions
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
    updateFormField,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    refresh,
    dismissSnackbar,

    // Helpers
    getEmployeeName,
    getShiftTypeColor,
  };
}

export default useShiftManager;
