import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Stack,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPrepLogs, getBatchRecipes } from '../../api/prep';
import dayjs from 'dayjs';
import type { PrepLog, BatchRecipe } from '../../interfaces/prep';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  completed: 'success',
  in_progress: 'warning',
  scheduled: 'info',
  cancelled: 'error',
};

export default function PrepLogs() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchRecipeFilter, setBatchRecipeFilter] = useState<number | ''>('');

  // Fetch prep logs
  const {
    data: logs = [],
    isLoading: logsLoading,
    error: logsError,
  } = useQuery<PrepLog[]>({
    queryKey: ['prep_logs', startDate, endDate, statusFilter, batchRecipeFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (statusFilter) params.status = statusFilter;
      if (batchRecipeFilter) params.batch_recipe_id = String(batchRecipeFilter);
      return getPrepLogs(params);
    },
  });

  // Fetch batch recipes for filter dropdown
  const { data: batchRecipes = [] } = useQuery<BatchRecipe[]>({
    queryKey: ['batch_recipes'],
    queryFn: getBatchRecipes,
    select: (data: any[]) =>
      data.map(br => ({
        batch_recipe_id: br.batch_recipe_id,
        name: br.name,
      })),
  });

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setBatchRecipeFilter('');
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default' }}>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Prep Logs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Historical records of completed and in-progress prep schedules.
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }} elevation={0}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Filters
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={e => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Batch Recipe</InputLabel>
            <Select
              value={batchRecipeFilter}
              label="Batch Recipe"
              onChange={e => setBatchRecipeFilter(e.target.value as number | '')}
            >
              <MenuItem value="">All</MenuItem>
              {batchRecipes.map(br => (
                <MenuItem key={br.batch_recipe_id} value={br.batch_recipe_id}>
                  {br.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {(startDate || endDate || statusFilter || batchRecipeFilter) && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Logs Table */}
      <Paper sx={{ bgcolor: 'background.paper' }} elevation={0}>
        {logsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : logsError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load prep logs. Please try again.
          </Alert>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No prep logs found matching your filters.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Prep Date</TableCell>
                <TableCell>Batch Recipe</TableCell>
                <TableCell align="right">Qty Needed</TableCell>
                <TableCell align="right">Qty Prepped</TableCell>
                <TableCell align="right">Batch Count</TableCell>
                <TableCell align="right">Est. Time</TableCell>
                <TableCell align="right">Actual Time</TableCell>
                <TableCell>Prepared By</TableCell>
                <TableCell>Expiry Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.prep_id} hover>
                  <TableCell>{dayjs(log.prep_date).format('MMM D, YYYY')}</TableCell>
                  <TableCell>{log.batch_recipe_name}</TableCell>
                  <TableCell align="right">{Number(log.quantity_needed).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    {log.quantity_prepped ? Number(log.quantity_prepped).toFixed(2) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {log.prep_batch_count ? Number(log.prep_batch_count).toFixed(1) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {log.prep_time_minutes_estimated
                      ? `${log.prep_time_minutes_estimated} min`
                      : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {log.prep_time_minutes_actual ? `${log.prep_time_minutes_actual} min` : '-'}
                  </TableCell>
                  <TableCell>{log.assigned_employee_name || '-'}</TableCell>
                  <TableCell>
                    {log.expiry_date ? (
                      <Typography
                        variant="body2"
                        sx={{
                          color: dayjs(log.expiry_date).isBefore(dayjs(), 'day')
                            ? 'error.main'
                            : dayjs(log.expiry_date).diff(dayjs(), 'day') <= 3
                              ? 'warning.main'
                              : 'text.primary',
                        }}
                      >
                        {dayjs(log.expiry_date).format('MMM D, YYYY')}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      color={statusColors[log.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
}
