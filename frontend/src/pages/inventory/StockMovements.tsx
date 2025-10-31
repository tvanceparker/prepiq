import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { getStockMovements, adjustInventory } from '../../api/inventory';
import { fetchIngredientNames, IngredientName } from '../../api/ingredients';
import { StockMovement } from '../../interfaces/inventory';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Adjustment dialog state
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

  useEffect(() => {
    fetchIngredientNames().then(setIngredientOptions);
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [startDate, endDate, ingredient]);

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
      // For simplicity, we'll use a placeholder inventory_id and lot_id
      // In a real app, you'd fetch the current inventory record for the ingredient
      await adjustInventory({
        inventory_id: selectedIngredient.ingredient_id, // Placeholder - should be actual inventory_id
        lot_id: 1, // Placeholder - should be actual lot_id
        adjustment_quantity: parseFloat(quantity),
        usage_type: adjustmentType,
        notes,
      });

      setSnackbar({ open: true, message: 'Inventory adjusted successfully', severity: 'success' });
      setDialogOpen(false);
      setSelectedIngredient(null);
      setQuantity('');
      setNotes('');
      fetchMovements(); // Refresh the list
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to adjust inventory', severity: 'error' });
    }
  };

  // Filter by type if set
  const filteredMovements = useMemo(() => {
    if (!typeFilter) return movements;
    return movements.filter(m => m.type === typeFilter);
  }, [movements, typeFilter]);

  // Get all unique types for filter chips
  const allTypes = useMemo(() => Array.from(new Set(movements.map(m => m.type))), [movements]);

  const columns = useMemo<MRT_ColumnDef<StockMovement>[]>(
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

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 3, bgcolor: 'background.paper' }} elevation={0}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h5">Stock Movements</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Adjust Inventory
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Track all inventory movements including purchases, sales, waste, and batch production
        </Typography>

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
            onChange={(_, v) => setIngredient(v)}
            sx={{ minWidth: 250 }}
            size="small"
            renderInput={params => <TextField {...params} label="Filter by Ingredient" />}
            isOptionEqualToValue={(o, v) => o.ingredient_id === v.ingredient_id}
          />
        </Stack>

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <MaterialReactTable
            columns={columns}
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
        )}
      </Paper>

      {/* Adjustment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Inventory</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={ingredientOptions}
              getOptionLabel={option => option.ingredient_name}
              value={selectedIngredient}
              onChange={(_, v) => setSelectedIngredient(v)}
              renderInput={params => <TextField {...params} label="Select Ingredient" />}
              isOptionEqualToValue={(o, v) => o.ingredient_id === v.ingredient_id}
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

      {/* Snackbar for notifications */}
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
