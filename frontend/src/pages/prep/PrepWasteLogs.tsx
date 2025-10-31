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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWasteLogs, createWasteLog, getIngredients, getBatchRecipes } from '../../api/prep';
import dayjs from 'dayjs';
import type { WasteLog, CreateWasteLogRequest } from '../../interfaces/prep';

const wasteTypeColors: Record<string, 'error' | 'warning'> = {
  waste: 'error',
  spoilage: 'warning',
};

export default function PrepWasteLogs() {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [wasteTypeFilter, setWasteTypeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state for new waste log
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [wasteType, setWasteType] = useState('waste');
  const [reason, setReason] = useState('manual_entry');
  const [notes, setNotes] = useState('');

  // Fetch waste logs
  const {
    data: logs = [],
    isLoading: logsLoading,
    error: logsError,
  } = useQuery<WasteLog[]>({
    queryKey: ['waste_logs', startDate, endDate, wasteTypeFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (wasteTypeFilter) params.waste_type = wasteTypeFilter;
      return getWasteLogs(params);
    },
  });

  // Fetch ingredients for dropdown
  const { data: ingredients = [] } = useQuery({
    queryKey: ['ingredients'],
    queryFn: getIngredients,
  });

  // Fetch batch recipes for dropdown
  const { data: batchRecipes = [] } = useQuery({
    queryKey: ['batch_recipes'],
    queryFn: getBatchRecipes,
  });

  // Create waste log mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateWasteLogRequest) => createWasteLog(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waste_logs'] });
      setDialogOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSelectedIngredient(null);
    setSelectedBatch(null);
    setQuantity('');
    setUnit('');
    setWasteType('waste');
    setReason('manual_entry');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!quantity || (!selectedIngredient && !selectedBatch)) {
      alert('Please select an item and enter quantity');
      return;
    }

    const data: CreateWasteLogRequest = {
      quantity_wasted: Number(quantity),
      unit: unit || selectedIngredient?.unit || selectedBatch?.yield_unit || 'unit',
      waste_type: wasteType,
      reason,
      notes,
    };

    if (selectedIngredient) {
      data.ingredient_id = selectedIngredient.ingredient_id;
    } else if (selectedBatch) {
      data.batch_recipe_id = selectedBatch.batch_recipe_id;
    }

    createMutation.mutate(data);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setWasteTypeFilter('');
  };

  // Calculate totals
  const totalWasted = logs.reduce((sum, log) => sum + Number(log.quantity_wasted), 0);
  const totalCost = logs.reduce((sum, log) => sum + (Number(log.cost_impact) || 0), 0);

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h4">Prep Waste Logs</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Log Waste
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track waste and spoilage for ingredients and batch recipes.
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
            <InputLabel>Type</InputLabel>
            <Select
              value={wasteTypeFilter}
              label="Type"
              onChange={e => setWasteTypeFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="waste">Waste</MenuItem>
              <MenuItem value="spoilage">Spoilage</MenuItem>
            </Select>
          </FormControl>
          {(startDate || endDate || wasteTypeFilter) && (
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

      {/* Summary Stats */}
      {logs.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'background.paper' }} elevation={0}>
            <Typography variant="body2" color="text.secondary">
              Total Items Wasted
            </Typography>
            <Typography variant="h5">{logs.length}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'background.paper' }} elevation={0}>
            <Typography variant="body2" color="text.secondary">
              Total Quantity
            </Typography>
            <Typography variant="h5">{totalWasted.toFixed(2)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, bgcolor: 'background.paper' }} elevation={0}>
            <Typography variant="body2" color="text.secondary">
              Estimated Cost Impact
            </Typography>
            <Typography variant="h5" color="error.main">
              ${totalCost.toFixed(2)}
            </Typography>
          </Paper>
        </Stack>
      )}

      {/* Waste Logs Table */}
      <Paper sx={{ bgcolor: 'background.paper' }} elevation={0}>
        {logsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : logsError ? (
          <Alert severity="error" sx={{ m: 2 }}>
            Failed to load waste logs. Please try again.
          </Alert>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No waste logs found matching your filters.
            </Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Cost Impact</TableCell>
                <TableCell>Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.usage_id} hover>
                  <TableCell>{dayjs(log.waste_date).format('MMM D, YYYY')}</TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {log.batch_recipe_name || log.ingredient_name}
                    </Typography>
                    {log.batch_recipe_name && (
                      <Typography variant="caption" color="text.secondary">
                        Batch Recipe
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.waste_type}
                      color={wasteTypeColors[log.waste_type] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {Number(log.quantity_wasted).toFixed(2)} {log.unit}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.reason}</Typography>
                    {log.notes && (
                      <Typography variant="caption" color="text.secondary">
                        {log.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {log.cost_impact ? `$${Number(log.cost_impact).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.batch_recipe_name ? 'Prep' : 'Ingredient'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Add Waste Log Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Waste/Spoilage</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={ingredients}
              getOptionLabel={opt => opt.name}
              value={selectedIngredient}
              onChange={(_, v) => {
                setSelectedIngredient(v);
                setSelectedBatch(null);
                if (v) setUnit(v.unit);
              }}
              renderInput={params => <TextField {...params} label="Ingredient" />}
              disabled={!!selectedBatch}
            />

            <Typography variant="caption" sx={{ textAlign: 'center' }}>
              OR
            </Typography>

            <Autocomplete
              options={batchRecipes}
              getOptionLabel={opt => opt.name}
              value={selectedBatch}
              onChange={(_, v) => {
                setSelectedBatch(v);
                setSelectedIngredient(null);
                if (v) setUnit(v.yield_unit);
              }}
              renderInput={params => <TextField {...params} label="Batch Recipe" />}
              disabled={!!selectedIngredient}
            />

            <TextField
              label="Quantity Wasted"
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              fullWidth
            />

            <TextField
              label="Unit"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Waste Type</InputLabel>
              <Select
                value={wasteType}
                label="Waste Type"
                onChange={e => setWasteType(e.target.value)}
              >
                <MenuItem value="waste">Waste</MenuItem>
                <MenuItem value="spoilage">Spoilage</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Reason</InputLabel>
              <Select value={reason} label="Reason" onChange={e => setReason(e.target.value)}>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="damaged">Damaged</MenuItem>
                <MenuItem value="overproduction">Overproduction</MenuItem>
                <MenuItem value="prep_error">Prep Error</MenuItem>
                <MenuItem value="contamination">Contamination</MenuItem>
                <MenuItem value="manual_entry">Other/Manual Entry</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            Log Waste
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
