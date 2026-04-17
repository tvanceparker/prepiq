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
import NorthEastIcon from '@mui/icons-material/NorthEast';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import TimelineIcon from '@mui/icons-material/Timeline';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

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

  const movementSummary = useMemo(() => {
    const inboundCount = filteredMovements.filter(item => item.quantity > 0).length;
    const outboundCount = filteredMovements.filter(item => item.quantity < 0).length;
    const netQuantity = filteredMovements.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    return {
      total: filteredMovements.length,
      inboundCount,
      outboundCount,
      netQuantity,
    };
  }, [filteredMovements]);

  const historySummary = useMemo(() => {
    const resolvedCount = filteredHistory.filter(item => item.status === 'Resolved').length;
    const acknowledgedCount = filteredHistory.filter(item => item.status === 'Acknowledged').length;
    const activeCount = filteredHistory.filter(item => item.status === 'Active').length;

    return {
      total: filteredHistory.length,
      resolvedCount,
      acknowledgedCount,
      activeCount,
    };
  }, [filteredHistory]);

  const pageTitle = viewMode === 'movements' ? 'Stock Movements' : 'Discrepancy History';
  const pageDescription =
    viewMode === 'movements'
      ? 'Track every inventory increase and decrease in one place, with filters that make additions, removals, and source context easy to scan.'
      : 'Review blocked deduction events, what triggered them, and how operators resolved them over time.';

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
    <Box sx={{ p: 3, bgcolor: 'background.default' }}>
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          color: 'common.white',
          background: 'linear-gradient(135deg, #0c4a6e 0%, #0f766e 48%, #22d3ee 100%)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 34%), radial-gradient(circle at bottom left, rgba(8,47,73,0.42), transparent 42%)',
          }}
        />
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          justifyContent="space-between"
          spacing={3}
          sx={{ position: 'relative' }}
        >
          <Box sx={{ maxWidth: 760 }}>
            <Typography variant="overline" sx={{ letterSpacing: 1.6, opacity: 0.88 }}>
              Inventory Ledger
            </Typography>
            <Typography variant="h3" sx={{ mt: 0.5, fontWeight: 800, lineHeight: 1.05 }}>
              {pageTitle}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1.25, maxWidth: 640, opacity: 0.92 }}>
              {pageDescription}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.25 }}>
              {viewMode === 'movements' ? (
                <>
                  <Chip
                    icon={<TimelineIcon sx={{ color: 'inherit !important' }} />}
                    label={`${movementSummary.total} movement rows`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                  />
                  <Chip
                    icon={<NorthEastIcon sx={{ color: 'inherit !important' }} />}
                    label={`${movementSummary.inboundCount} inbound`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                  />
                  <Chip
                    icon={<SouthWestIcon sx={{ color: 'inherit !important' }} />}
                    label={`${movementSummary.outboundCount} outbound`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                  />
                </>
              ) : (
                <>
                  <Chip
                    icon={<HistoryEduIcon sx={{ color: 'inherit !important' }} />}
                    label={`${historySummary.total} history rows`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                  />
                  <Chip
                    label={`${historySummary.activeCount} active`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                  />
                  <Chip
                    label={`${historySummary.resolvedCount} resolved`}
                    sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }}
                  />
                </>
              )}
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="outlined"
              size="large"
              onClick={() => refreshData()}
              sx={{
                px: 3,
                py: 1.5,
                borderRadius: 2.5,
                color: 'common.white',
                borderColor: 'rgba(255,255,255,0.52)',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.78)',
                  bgcolor: 'rgba(255,255,255,0.14)',
                },
              }}
            >
              Refresh Ledger
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                px: 3.5,
                py: 1.5,
                borderRadius: 2.5,
                bgcolor: '#ecfeff',
                color: '#0f4c5c',
                boxShadow: '0 18px 36px rgba(8, 47, 73, 0.22)',
                '&:hover': { bgcolor: '#ffffff' },
              }}
            >
              Adjust Inventory
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            justifyContent="space-between"
            spacing={2}
            alignItems={{ lg: 'center' }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Filters and Scope
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Narrow the ledger by date range, ingredient, and movement type without leaving the
                page.
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, nextValue) => {
                if (nextValue) setViewMode(nextValue);
              }}
              size="small"
              sx={{
                bgcolor: 'rgba(12,74,110,0.06)',
                borderRadius: 2,
                '& .MuiToggleButton-root': {
                  px: 2,
                  border: 0,
                  color: 'text.secondary',
                },
                '& .Mui-selected': {
                  bgcolor: 'rgba(15,118,110,0.14) !important',
                  color: '#0f4c5c !important',
                  fontWeight: 700,
                },
              }}
            >
              <ToggleButton value="movements">Movements</ToggleButton>
              <ToggleButton value="discrepancies">Discrepancies</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
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
              sx={{ minWidth: 250, flex: 1 }}
              size="small"
              renderInput={params => <TextField {...params} label="Filter by Ingredient" />}
              isOptionEqualToValue={(left, right) => left.ingredient_id === right.ingredient_id}
            />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.5,
            }}
          >
            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(34,211,238,0.05)' }}
            >
              <Typography variant="caption" color="text.secondary">
                Visible Window
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {startDate} to {endDate}
              </Typography>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(15,118,110,0.05)' }}
            >
              <Typography variant="caption" color="text.secondary">
                Ingredient Scope
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {ingredient?.ingredient_name || 'All ingredients'}
              </Typography>
            </Paper>
            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(12,74,110,0.05)' }}
            >
              <Typography variant="caption" color="text.secondary">
                {viewMode === 'movements' ? 'Net Visible Quantity' : 'Open Issues In View'}
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {viewMode === 'movements'
                  ? `${movementSummary.netQuantity > 0 ? '+' : ''}${movementSummary.netQuantity.toFixed(2)}`
                  : historySummary.activeCount + historySummary.acknowledgedCount}
              </Typography>
            </Paper>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5, bgcolor: 'background.paper', borderRadius: 3 }} elevation={0}>
        {viewMode === 'movements' ? (
          <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" gap={1}>
            <Chip
              label="All Types"
              color={!typeFilter ? 'primary' : 'default'}
              onClick={() => setTypeFilter(null)}
              size="small"
              sx={{ fontWeight: !typeFilter ? 700 : 500 }}
            />
            {allTypes.map(type => (
              <Chip
                key={type}
                label={type}
                color={typeFilter === type ? 'primary' : 'default'}
                onClick={() => setTypeFilter(type)}
                sx={{ textTransform: 'capitalize', fontWeight: typeFilter === type ? 700 : 500 }}
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
              sx={{ fontWeight: !historyStatusFilter ? 700 : 500 }}
            />
            {allHistoryStatuses.map(status => (
              <Chip
                key={status}
                label={status}
                color={historyStatusFilter === status ? 'primary' : 'default'}
                onClick={() => setHistoryStatusFilter(status)}
                size="small"
                sx={{ fontWeight: historyStatusFilter === status ? 700 : 500 }}
              />
            ))}
          </Stack>
        )}

        {viewMode === 'movements' && loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : viewMode === 'movements' && error ? (
          <Alert severity="error">{error}</Alert>
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
            muiTablePaperProps={{
              elevation: 0,
              sx: {
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              },
            }}
            muiTableBodyRowProps={({ row }) => ({
              sx: {
                backgroundColor:
                  row.original.quantity < 0
                    ? 'rgba(211, 47, 47, 0.04)'
                    : 'rgba(15, 118, 110, 0.05)',
              },
            })}
            muiTableHeadCellProps={{
              sx: {
                backgroundColor: 'rgba(12,74,110,0.06)',
                fontWeight: 'bold',
              },
            }}
          />
        ) : historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : historyError ? (
          <Alert severity="error">{historyError}</Alert>
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
            muiTablePaperProps={{
              elevation: 0,
              sx: {
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              },
            }}
            muiTableBodyRowProps={({ row }) => ({
              sx: {
                backgroundColor:
                  row.original.status === 'Resolved'
                    ? 'rgba(15, 118, 110, 0.05)'
                    : row.original.status === 'Acknowledged'
                      ? 'rgba(14, 165, 233, 0.06)'
                      : 'rgba(211, 47, 47, 0.04)',
              },
            })}
            muiTableHeadCellProps={{
              sx: {
                backgroundColor: 'rgba(12,74,110,0.06)',
                fontWeight: 'bold',
              },
            }}
          />
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ p: 0 }}>
          <Box
            sx={{
              px: 3,
              py: 2.25,
              color: 'common.white',
              background: 'linear-gradient(135deg, #0f4c5c 0%, #0891b2 100%)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Adjust Inventory
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Record a stock increase, decrease, waste event, or spoilage note directly into the
              movement ledger.
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ mt: 1 }}>
              Added and removed stock will appear in the ledger with clear direction labels so the
              adjustment history stays readable.
            </Alert>
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
