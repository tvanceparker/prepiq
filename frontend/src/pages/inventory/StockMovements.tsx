import React, { useEffect, useState, useMemo } from 'react';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { getStockMovements } from '../../api/inventory';
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
} from '@mui/material';

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

  useEffect(() => {
    fetchIngredientNames().then(setIngredientOptions);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStockMovements(startDate, endDate, ingredient?.ingredient_id)
      .then(setMovements)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [startDate, endDate, ingredient]);

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
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Stock Movements
        </Typography>
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
    </Box>
  );
}
