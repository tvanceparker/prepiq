import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add, Edit, Delete, ArrowBack, ArrowForward } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  getWeeklySchedule,
  createScheduledShift,
  updateScheduledShift,
  deleteScheduledShift,
  getAllEmployees,
  ShiftScheduleData,
  ShiftScheduleResponse,
} from '../../api/team';

dayjs.extend(isoWeek);

interface Employee {
  employee_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  status: string;
}

const SHIFT_TYPES = ['morning', 'afternoon', 'evening', 'night', 'full_day'];

const ShiftManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState<Dayjs>(dayjs().startOf('isoWeek'));
  const [openDialog, setOpenDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftScheduleResponse | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState<ShiftScheduleData>({
    employee_id: 0,
    shift_date: dayjs().format('YYYY-MM-DD'),
    shift_start_time: '09:00',
    shift_end_time: '17:00',
    shift_type: 'full_day',
  });

  // Calculate week end date
  const weekEnd = currentWeekStart.add(6, 'day');

  // Fetch employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['employees'],
    queryFn: getAllEmployees,
  });

  const employees: Employee[] = employeesResponse?.data || [];

  // Fetch weekly schedule
  const { data: scheduleResponse, isLoading } = useQuery({
    queryKey: ['weekly-schedule', currentWeekStart.format('YYYY-MM-DD')],
    queryFn: () =>
      getWeeklySchedule(currentWeekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD')),
  });

  const shifts: ShiftScheduleResponse[] = scheduleResponse?.data || [];

  // Create shift mutation
  const createMutation = useMutation({
    mutationFn: createScheduledShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      setSnackbar({ open: true, message: 'Shift created successfully', severity: 'success' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error?.response?.data?.detail || 'Failed to create shift',
        severity: 'error',
      });
    },
  });

  // Update shift mutation
  const updateMutation = useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: number; data: ShiftScheduleData }) =>
      updateScheduledShift(shiftId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      setSnackbar({ open: true, message: 'Shift updated successfully', severity: 'success' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error?.response?.data?.detail || 'Failed to update shift',
        severity: 'error',
      });
    },
  });

  // Delete shift mutation
  const deleteMutation = useMutation({
    mutationFn: deleteScheduledShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-schedule'] });
      setSnackbar({ open: true, message: 'Shift deleted successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error?.response?.data?.detail || 'Failed to delete shift',
        severity: 'error',
      });
    },
  });

  const handleOpenDialog = (shift?: ShiftScheduleResponse) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        employee_id: shift.employee_id,
        shift_date: shift.shift_date,
        shift_start_time: shift.shift_start_time,
        shift_end_time: shift.shift_end_time,
        shift_type: shift.shift_type,
      });
    } else {
      setEditingShift(null);
      setFormData({
        employee_id: 0,
        shift_date: currentWeekStart.format('YYYY-MM-DD'),
        shift_start_time: '09:00',
        shift_end_time: '17:00',
        shift_type: 'full_day',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingShift(null);
  };

  const handleSubmit = () => {
    if (formData.employee_id === 0) {
      setSnackbar({ open: true, message: 'Please select an employee', severity: 'error' });
      return;
    }

    if (editingShift) {
      updateMutation.mutate({ shiftId: editingShift.shift_id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (shiftId: number) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      deleteMutation.mutate(shiftId);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(currentWeekStart.subtract(7, 'day'));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(currentWeekStart.add(7, 'day'));
  };

  const handleToday = () => {
    setCurrentWeekStart(dayjs().startOf('isoWeek'));
  };

  // Group shifts by date and employee
  const getDayShifts = (date: Dayjs) => {
    return shifts.filter(shift => dayjs(shift.shift_date).isSame(date, 'day'));
  };

  const getShiftColor = (shiftType: string) => {
    switch (shiftType) {
      case 'morning':
        return 'primary';
      case 'afternoon':
        return 'secondary';
      case 'evening':
        return 'warning';
      case 'night':
        return 'info';
      case 'full_day':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold">
            Shift Manager
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Shift
          </Button>
        </Box>

        {/* Week Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={handlePreviousWeek}>
            <ArrowBack />
          </IconButton>
          <Button variant="outlined" onClick={handleToday}>
            Today
          </Button>
          <Typography variant="h6">
            {currentWeekStart.format('MMM D, YYYY')} - {weekEnd.format('MMM D, YYYY')}
          </Typography>
          <IconButton onClick={handleNextWeek}>
            <ArrowForward />
          </IconButton>
        </Box>

        {/* Weekly Calendar */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {Array.from({ length: 7 }).map((_, index) => {
                  const date = currentWeekStart.add(index, 'day');
                  const isToday = date.isSame(dayjs(), 'day');
                  return (
                    <TableCell
                      key={index}
                      align="center"
                      sx={{
                        fontWeight: 'bold',
                        bgcolor: isToday ? 'primary.light' : 'inherit',
                        color: isToday ? 'primary.contrastText' : 'inherit',
                      }}
                    >
                      <Box>
                        <Typography variant="caption">{date.format('ddd')}</Typography>
                        <Typography variant="body2">{date.format('MMM D')}</Typography>
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Group by employee */}
              {employees.map(employee => (
                <TableRow key={employee.employee_id}>
                  {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const date = currentWeekStart.add(dayIndex, 'day');
                    const dayShifts = getDayShifts(date).filter(
                      s => s.employee_id === employee.employee_id
                    );

                    return (
                      <TableCell key={dayIndex} sx={{ verticalAlign: 'top', minHeight: 100 }}>
                        {dayShifts.length === 0 ? (
                          <Box
                            sx={{
                              minHeight: 60,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0.3,
                            }}
                          >
                            <Typography variant="caption">
                              {employee.first_name} {employee.last_name}
                            </Typography>
                          </Box>
                        ) : (
                          dayShifts.map(shift => (
                            <Box
                              key={shift.shift_id}
                              sx={{
                                mb: 1,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: `${getShiftColor(shift.shift_type)}.light`,
                                position: 'relative',
                              }}
                            >
                              <Typography variant="caption" display="block" fontWeight="bold">
                                {shift.employee_name}
                              </Typography>
                              <Typography variant="caption" display="block">
                                {shift.shift_start_time} - {shift.shift_end_time}
                              </Typography>
                              <Chip
                                label={shift.shift_type}
                                size="small"
                                color={getShiftColor(shift.shift_type) as any}
                                sx={{ mt: 0.5, fontSize: '0.65rem' }}
                              />
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenDialog(shift)}
                                  sx={{ p: 0.5 }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDelete(shift.shift_id)}
                                  sx={{ p: 0.5 }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ))
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {isLoading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography>Loading schedule...</Typography>
          </Box>
        )}

        {!isLoading && shifts.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No shifts scheduled for this week. Click "Add Shift" to get started.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Add/Edit Shift Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingShift ? 'Edit Shift' : 'Add Shift'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Employee"
              value={formData.employee_id}
              onChange={e => setFormData({ ...formData, employee_id: Number(e.target.value) })}
              fullWidth
            >
              <MenuItem value={0}>Select Employee</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.employee_id} value={emp.employee_id}>
                  {emp.first_name} {emp.last_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Date"
              type="date"
              value={formData.shift_date}
              onChange={e => setFormData({ ...formData, shift_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Start Time"
              type="time"
              value={formData.shift_start_time}
              onChange={e => setFormData({ ...formData, shift_start_time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="End Time"
              type="time"
              value={formData.shift_end_time}
              onChange={e => setFormData({ ...formData, shift_end_time: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Shift Type"
              value={formData.shift_type}
              onChange={e => setFormData({ ...formData, shift_type: e.target.value })}
              fullWidth
            >
              {SHIFT_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {type.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingShift ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShiftManager;
