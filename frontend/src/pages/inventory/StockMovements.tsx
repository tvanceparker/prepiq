import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import {
  getStockMovements,
  getInventoryDiscrepancyHistory,
  adjustInventory,
} from '../../api/inventory';
import { fetchIngredientNames, IngredientName } from '../../api/ingredients';
import { InventoryDiscrepancyHistoryItem, StockMovement } from '../../interfaces/inventory';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Autocomplete,
  Chip,
  Stack,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function StockMovementsPage() {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(weekAgo);
  const [endDate, setEndDate] = useState(today);

  const [ingredient, setIngredient] = useState<IngredientName | null>(null);
  const [ingredientOptions, setIngredientOptions] = useState<IngredientName[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [historyItems, setHistoryItems] = useState<InventoryDiscrepancyHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'movements' | 'discrepancies'>('movements');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientName | null>(null);
  const [quantity, setQuantity] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('manual_addition');
  const [notes, setNotes] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const fetchMovements = useCallback(() => {
    setLoading(true);
    setError(null);
    getStockMovements(startDate, endDate, ingredient?.ingredient_id)
      .then(setMovements)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [startDate, endDate, ingredient]);

  const fetchHistory = useCallback(() => {
    setHistoryLoading(true);
    setHistoryError(null);
    getInventoryDiscrepancyHistory(startDate, endDate, ingredient?.ingredient_id)
      .then(setHistoryItems)
      .catch(e => setHistoryError(e.message))
      .finally(() => setHistoryLoading(false));
  }, [startDate, endDate, ingredient]);

  const refreshData = useCallback(() => {
    fetchMovements();
    fetchHistory();
  }, [fetchHistory, fetchMovements]);

  useEffect(() => {
    fetchIngredientNames().then(setIngredientOptions);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleAdjustment = async () => {
    if (!selectedIngredient || !quantity) {
      setSnackbar({
        open: true,
        message: 'Please select an ingredient and enter quantity',
        severity: 'error',
      });
      return;
    }

    try {
      await adjustInventory({
        inventory_id: selectedIngredient.ingredient_id,
        lot_id: 1,
        adjustment_quantity: parseFloat(quantity),
        usage_type: adjustmentType,
        notes,
      });

      setSnackbar({ open: true, message: 'Inventory adjusted successfully', severity: 'success' });
      setDialogOpen(false);
      setSelectedIngredient(null);
      setQuantity('');
      setNotes('');
      refreshData();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to adjust inventory', severity: 'error' });
    }
  };

  const filteredMovements = useMemo(() => {
    if (!typeFilter) return movements;
    return movements.filter(m => m.type === typeFilter);
  }, [movements, typeFilter]);

  const allTypes = useMemo(() => Array.from(new Set(movements.map(m => m.type))), [movements]);

  const filteredHistory = useMemo(() => {
    if (!historyStatusFilter) return historyItems;
    return historyItems.filter(item => item.status === historyStatusFilter);
  }, [historyItems, historyStatusFilter]);

  const allHistoryStatuses = useMemo(
    () => Array.from(new Set(historyItems.map(item => item.status))).sort(),
    [historyItems]
  );

  const movementColumns = useMemo<MRT_ColumnDef<StockMovement>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        size: 110,
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleDateString(),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 150,
        Cell: ({ cell }) => {
          const quantity = cell.row.original.quantity;
          return (
            <Chip
              label={cell.getValue<string>()}
              size="small"
              color={quantity < 0 ? 'error' : 'success'}
              sx={{ textTransform: 'capitalize' }}
            />
          );
        },
      },
      {
        accessorKey: 'ingredient_name',
        header: 'Ingredient',
        size: 180,
      },
      {
        accessorKey: 'quantity',
        header: 'Quantity',
        size: 100,
        Cell: ({ cell }) => {
          const value = cell.getValue<number>();
          return (
            <Typography
              sx={{
                color: value < 0 ? theme.palette.error.main : theme.palette.success.main,
                fontWeight: 600,
              }}
            >
              {value > 0 ? `+${value}` : value}
            </Typography>
          );
        },
      },
      {
        accessorKey: 'unit',
        header: 'Unit',
        size: 80,
      },
      {
        accessorKey: 'source_or_destination',
        header: 'Source/Dest',
        size: 140,
        Cell: ({ cell }) => cell.getValue<string>() || '-',
      },
      {
        accessorKey: 'lot_id',
        header: 'Lot',
        size: 80,
        Cell: ({ cell }) => cell.getValue<number>() ?? '-',
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        size: 180,
        Cell: ({ cell }) => cell.getValue<string>() || '',
      },
      {
        accessorKey: 'running_balance',
        header: 'Running Balance',
        size: 130,
        Cell: ({ cell }) => {
          const value = cell.getValue<number>();
          return (
            <Typography sx={{ fontWeight: 600 }}>
              {value !== null && value !== undefined ? value.toFixed(2) : '-'}
            </Typography>
          );
        },
      },
    ],
    [theme]
  );

  const historyColumns = useMemo<MRT_ColumnDef<InventoryDiscrepancyHistoryItem>[]>(
    () => [
      {
        accessorKey: 'last_updated',
        header: 'Updated',
        size: 150,
        Cell: ({ cell }) => new Date(cell.getValue<string>()).toLocaleString(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 120,
        Cell: ({ row }) => {
          const status = row.original.status;
          const color =
            status === 'Resolved' ? 'success' : status === 'Acknowledged' ? 'warning' : 'error';
          return <Chip label={status} size="small" color={color} />;
        },
      },
      {
        accessorKey: 'item_name',
        header: 'Item',
        size: 180,
        Cell: ({ row }) => (
          <Stack spacing={0.5}>
            <Typography fontWeight={600}>{row.original.item_name || 'Unknown item'}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.original.item_kind === 'batch' ? 'Batch recipe' : 'Ingredient'}
            </Typography>
          </Stack>
        ),
      },
      {
        accessorKey: 'shortfall_quantity',
        header: 'Shortfall',
        size: 110,
        Cell: ({ row }) => `${row.original.shortfall_quantity} ${row.original.unit || ''}`.trim(),
      },
      {
        accessorKey: 'current_quantity_on_hand',
        header: 'Qty On Hand',
        size: 130,
        Cell: ({ row }) =>
          `${row.original.current_quantity_on_hand} ${row.original.unit || ''}`.trim(),
      },
      {
        accessorKey: 'required_quantity',
        header: 'Needed',
        size: 120,
        Cell: ({ row }) => `${row.original.required_quantity} ${row.original.unit || ''}`.trim(),
      },
      {
        accessorKey: 'reference_type',
        header: 'Source',
        size: 150,
        Cell: ({ row }) => {
          if (!row.original.reference_type) return '-';
          return row.original.reference_id
            ? `${row.original.reference_type} #${row.original.reference_id}`
            : row.original.reference_type;
        },
      },
      {
        accessorKey: 'attempted_day',
        header: 'Attempted',
        size: 120,
        Cell: ({ cell }) => cell.getValue<string>() || '-',
      },
      {
        accessorKey: 'date_resolved',
        header: 'Resolved',
        size: 150,
        Cell: ({ cell }) => {
          const value = cell.getValue<string | null>();
          return value ? new Date(value).toLocaleString() : '-';
        },
      },
      {
        accessorKey: 'message',
        header: 'Details',
        size: 320,
      },
    ],
    []
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, bgcolor: 'background.paper' }} elevation={0}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">
            {viewMode === 'movements' ? 'Stock Movements' : 'Discrepancy History'}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Adjust Inventory
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {viewMode === 'movements'
            ? 'Track all inventory movements including purchases, sales, waste, and batch production'
            : 'Review blocked deductions and how they were acknowledged or resolved over time'}
        </Typography>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, nextValue) => {
            if (nextValue) setViewMode(nextValue);
          }}
          size="small"
          sx={{ mt: 2, mb: 1 }}
        >
          <ToggleButton value="movements">Movements</ToggleButton>
          <ToggleButton value="discrepancies">Discrepancies</ToggleButton>
        </ToggleButtonGroup>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} my={3} alignItems="center">
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />
          <Autocomplete
            options={ingredientOptions}
            getOptionLabel={option => option.ingredient_name}
            value={ingredient}
            onChange={(_, value) => setIngredient(value)}
            sx={{ minWidth: 250 }}
            size="small"
            renderInput={params => <TextField {...params} label="Filter by Ingredient" />}
            isOptionEqualToValue={(left, right) => left.ingredient_id === right.ingredient_id}
          />
        </Stack>

        {viewMode === 'movements' ? (
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" gap={1}>
            <Chip
              label="All Types"
              color={!typeFilter ? 'primary' : 'default'}
              onClick={() => setTypeFilter(null)}
              size="small"
            />
            {allTypes.map(type => (
              <Chip
                key={type}
                label={type}
                color={typeFilter === type ? 'primary' : 'default'}
                onClick={() => setTypeFilter(type)}
                sx={{ textTransform: 'capitalize' }}
                size="small"
              />
            ))}
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" gap={1}>
            <Chip
              label="All Statuses"
              color={!historyStatusFilter ? 'primary' : 'default'}
              onClick={() => setHistoryStatusFilter(null)}
              size="small"
            />
            {allHistoryStatuses.map(status => (
              <Chip
                key={status}
                label={status}
                color={historyStatusFilter === status ? 'primary' : 'default'}
                onClick={() => setHistoryStatusFilter(status)}
                size="small"
              />
            ))}
          </Stack>
        )}

        {viewMode === 'movements' && loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : viewMode === 'movements' && error ? (
          <Typography color="error">{error}</Typography>
        ) : viewMode === 'movements' ? (
          <MaterialReactTable
            columns={movementColumns}
            data={filteredMovements}
            enableRowSelection={false}
            enableColumnFilters
            enableSorting
            enablePagination
            enableColumnOrdering
            enableDensityToggle
            initialState={{
              density: 'compact',
              pagination: { pageSize: 25, pageIndex: 0 },
              sorting: [{ id: 'date', desc: true }],
            }}
            muiTableBodyRowProps={({ row }) => ({
              sx: {
                backgroundColor:
                  row.original.quantity < 0 ? 'rgba(211, 47, 47, 0.04)' : 'rgba(56, 142, 60, 0.04)',
              },
            })}
            muiTableHeadCellProps={{
              sx: {
                backgroundColor: theme.palette.action.selected,
                fontWeight: 'bold',
              },
            }}
          />
        ) : historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : historyError ? (
          <Typography color="error">{historyError}</Typography>
        ) : (
          <MaterialReactTable
            columns={historyColumns}
            data={filteredHistory}
            enableRowSelection={false}
            enableColumnFilters
            enableSorting
            enablePagination
            enableColumnOrdering
            enableDensityToggle
            initialState={{
              density: 'compact',
              pagination: { pageSize: 25, pageIndex: 0 },
              sorting: [{ id: 'last_updated', desc: true }],
            }}
            muiTableBodyRowProps={({ row }) => ({
              sx: {
                backgroundColor:
                  row.original.status === 'Resolved'
                    ? 'rgba(56, 142, 60, 0.04)'
                    : row.original.status === 'Acknowledged'
                      ? 'rgba(237, 108, 2, 0.06)'
                      : 'rgba(211, 47, 47, 0.04)',
              },
            })}
            muiTableHeadCellProps={{
              sx: {
                backgroundColor: theme.palette.action.selected,
                fontWeight: 'bold',
              },
            }}
          />
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Inventory</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={ingredientOptions}
              getOptionLabel={option => option.ingredient_name}
              value={selectedIngredient}
              onChange={(_, value) => setSelectedIngredient(value)}
              renderInput={params => <TextField {...params} label="Select Ingredient" />}
              isOptionEqualToValue={(left, right) => left.ingredient_id === right.ingredient_id}
            />

            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Adjustment Type</InputLabel>
              <Select
                value={adjustmentType}
                label="Adjustment Type"
                onChange={e => setAdjustmentType(e.target.value)}
              >
                <MenuItem value="manual_addition">Add to Inventory</MenuItem>
                <MenuItem value="manual_adjustment">Subtract from Inventory</MenuItem>
                <MenuItem value="waste">Mark as Waste</MenuItem>
                <MenuItem value="spoilage">Mark as Spoilage</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Notes (optional)"
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
          <Button variant="contained" onClick={handleAdjustment}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
