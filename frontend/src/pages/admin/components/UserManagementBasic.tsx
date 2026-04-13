import React, { useState, useMemo } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import UserManagementBasicModal from './UserManagementBasicModal';
import Button from '../../../components/Button';
import { PageHeader } from '../../../components/PageHeader';
import type { Employee, UserManagementFormData } from '../../../interfaces/admin';
import type { SnackbarState } from '../../../interfaces/ui';
import {
  Box,
  Stack,
  Snackbar,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Chip,
  Grid,
  Typography,
} from '@mui/material';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';

export default function UserManagementBasic() {
  const {
    employees,
    roles,
    loading,
    error,
    fetchEmployees,
    addEmployee,
    editEmployee,
    removeEmployee,
  } = useEmployees();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive'>('active');

  const showSnackbar = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const openModal = (employee: Employee | null = null) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  };

  const handleSave = async (formData: UserManagementFormData) => {
    try {
      if (editingEmployee) {
        const updateData: any = { ...formData };
        if (!updateData.password) delete updateData.password;
        await editEmployee(editingEmployee.employee_id, updateData);
        showSnackbar('Employee updated successfully!');
      } else {
        await addEmployee(formData);
        showSnackbar('Employee added successfully!');
      }
      await fetchEmployees();
      setModalOpen(false);
    } catch (err: any) {
      showSnackbar('Error saving employee: ' + (err.message || err), 'error');
    }
  };

  const handleDisable = async (employeeId: number) => {
    if (window.confirm('Are you sure you want to disable this employee?')) {
      try {
        await removeEmployee(employeeId);
        showSnackbar('Employee disabled successfully!');
        await fetchEmployees();
      } catch (err: any) {
        showSnackbar('Error disabling employee: ' + (err.message || err), 'error');
      }
    }
  };

  // Filter employees by active/inactive status
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];
    return employees.filter(emp => (filterStatus === 'active' ? emp.is_active : !emp.is_active));
  }, [employees, filterStatus]);

  // Prepare rows data with role info
  const rows = useMemo(() => {
    if (!Array.isArray(roles)) return [];
    return filteredEmployees.map(emp => {
      const role = roles.find(r => r.role_id === emp.role_id);
      return {
        id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        username: emp.username,
        phone: emp.phone,
        pay_rate: emp.pay_rate,
        employment_type: emp.employment_type,
        role: role ? role.name : '—',
        is_active: emp.is_active,
        _raw: emp,
        _isAdmin: role?.name === 'Admin',
      };
    });
  }, [filteredEmployees, roles]);

  const stats = useMemo(() => {
    const activeCount = Array.isArray(employees)
      ? employees.filter(emp => emp.is_active).length
      : 0;
    const inactiveCount = Array.isArray(employees)
      ? employees.filter(emp => !emp.is_active).length
      : 0;
    const adminCount = rows.filter(row => row._isAdmin).length;
    return { activeCount, inactiveCount, adminCount };
  }, [employees, rows]);

  return (
    <Paper
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      <PageHeader
        eyebrow="Admin workspace"
        title="User Management"
        description="Manage active staff accounts, review role coverage, and disable access cleanly without leaving the main workspace."
        icon={<GroupOutlinedIcon />}
        actions={
          <Button showIcon={false} variant="confirm" onClick={() => openModal()}>
            Add Employee
          </Button>
        }
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Active employees
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {stats.activeCount}
                </Typography>
              </Box>
              <Chip
                icon={<GroupOutlinedIcon />}
                label="Active"
                color="success"
                variant="outlined"
              />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Admin coverage
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {stats.adminCount}
                </Typography>
              </Box>
              <Chip
                icon={<AdminPanelSettingsOutlinedIcon />}
                label="Admins"
                color="primary"
                variant="outlined"
              />
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Inactive accounts
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {stats.inactiveCount}
                </Typography>
              </Box>
              <Chip
                icon={<PersonOffOutlinedIcon />}
                label="Inactive"
                color="default"
                variant="outlined"
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Active / Inactive Filter Toggle */}
      <Box mb={2}>
        <ToggleButtonGroup
          value={filterStatus}
          exclusive
          onChange={(_, val) => val && setFilterStatus(val)}
          aria-label="Filter employees by active status"
          size="small"
        >
          <ToggleButton value="active" aria-label="Show active employees">
            Active
          </ToggleButton>
          <ToggleButton value="inactive" aria-label="Show inactive employees">
            Inactive
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Typography color="error" mb={2}>
          {error.message || 'An error occurred'}
        </Typography>
      )}

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 5,
          }}
        >
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Typography>No employees found.</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader aria-label="Employees table" size="medium">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Pay Rate</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.username}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.pay_rate}</TableCell>
                  <TableCell>{row.employment_type}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Button
                        showIcon={false}
                        variant="edit"
                        size="sm"
                        onClick={() => openModal(row._raw)}
                        disabled={row._isAdmin}
                      >
                        Edit
                      </Button>
                      {row.is_active && (
                        <Button
                          showIcon={false}
                          variant="delete"
                          size="sm"
                          onClick={() => handleDisable(row.id)}
                          disabled={row._isAdmin}
                        >
                          Disable
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserManagementBasicModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        employee={editingEmployee}
        roles={(roles || []) as any[]}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
