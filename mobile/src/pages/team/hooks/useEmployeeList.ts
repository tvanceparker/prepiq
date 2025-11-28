// src/pages/team/hooks/useEmployeeList.ts
import { useState, useMemo, useCallback } from 'react';
import { useEmployees } from '../../../hooks/useTeam';
import type {
  Employee,
  EmployeeCreate,
  EmployeeUpdate,
  EmployeeFormData,
} from '../../../interfaces/team';

const INITIAL_FORM_DATA: EmployeeFormData = {
  name: '',
  email: '',
  phone: '',
  role_id: 0,
  hourly_rate: '',
  is_active: true,
  password: '',
};

export function useEmployeeList() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(INITIAL_FORM_DATA);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Queries & mutations
  const {
    employees = [],
    loading,
    refresh,
    createEmployee,
    creating,
    updateEmployee,
    updating,
  } = useEmployees();

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (emp: Employee) =>
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.role_name?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  // Count active employees
  const activeCount = useMemo(() => {
    return employees.filter((e: Employee) => e.is_active !== false).length;
  }, [employees]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  }, [refresh]);

  // Open create dialog
  const openCreate = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setShowCreateDialog(true);
  }, []);

  // Open edit dialog
  const openEdit = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role_id: employee.role_id || 0,
      hourly_rate: employee.hourly_rate?.toString() || '',
      is_active: employee.is_active !== false,
      password: '',
    });
  }, []);

  // Close dialogs
  const closeDialog = useCallback(() => {
    setShowCreateDialog(false);
    setEditingEmployee(null);
    setFormData(INITIAL_FORM_DATA);
  }, []);

  // Handle create
  const handleCreate = useCallback(async () => {
    if (!formData.name.trim()) {
      setSnackbar({ visible: true, message: 'Name is required' });
      return;
    }

    try {
      await createEmployee({
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone || undefined,
        role_id: formData.role_id || 1,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        is_active: formData.is_active,
        password: formData.password || 'changeme',
      });
      setSnackbar({ visible: true, message: 'Employee created successfully' });
      closeDialog();
    } catch (error) {
      setSnackbar({ visible: true, message: 'Failed to create employee' });
    }
  }, [formData, createEmployee, closeDialog]);

  // Handle update
  const handleUpdate = useCallback(async () => {
    if (!editingEmployee || !formData.name.trim()) {
      setSnackbar({ visible: true, message: 'Name is required' });
      return;
    }

    try {
      await updateEmployee({
        id: editingEmployee.employee_id,
        data: {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          role_id: formData.role_id || undefined,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
          is_active: formData.is_active,
        },
      });
      setSnackbar({ visible: true, message: 'Employee updated successfully' });
      closeDialog();
    } catch (error) {
      setSnackbar({ visible: true, message: 'Failed to update employee' });
    }
  }, [editingEmployee, formData, updateEmployee, closeDialog]);

  // Update form field
  const updateFormField = useCallback(
    <K extends keyof EmployeeFormData>(field: K, value: EmployeeFormData[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  // Get initials from name
  const getInitials = useCallback((employee: Employee) => {
    const parts = (employee.name || '').split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || '??';
  }, []);

  // Get role color
  const getRoleColor = useCallback((role?: string) => {
    switch (role?.toLowerCase()) {
      case 'manager':
        return '#9c27b0';
      case 'chef':
      case 'cook':
        return '#ff9800';
      case 'server':
      case 'waiter':
        return '#2196f3';
      case 'cashier':
        return '#4caf50';
      default:
        return '#6200ee';
    }
  }, []);

  // Dismiss snackbar
  const dismissSnackbar = useCallback(() => {
    setSnackbar(s => ({ ...s, visible: false }));
  }, []);

  return {
    // State
    searchQuery,
    showCreateDialog,
    editingEmployee,
    formData,
    snackbar,
    refreshing,

    // Data
    employees,
    filteredEmployees,
    activeCount,
    loading,
    creating,
    updating,

    // Actions
    setSearchQuery,
    openCreate,
    openEdit,
    closeDialog,
    handleCreate,
    handleUpdate,
    updateFormField,
    onRefresh,
    dismissSnackbar,

    // Helpers
    getInitials,
    getRoleColor,
  };
}

export default useEmployeeList;
