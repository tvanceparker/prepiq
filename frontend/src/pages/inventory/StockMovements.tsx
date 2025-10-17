import React, { useEffect, useState, useMemo } from 'react';
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
} from '@mui/material';

const today = new Date().toISOString().slice(0, 10);
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function StockMovementsPage() {
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

  return (
    <Paper sx={{ maxWidth: 1200, mt: 4, mx: 'auto', px: { xs: 2, md: 4 }, py: { xs: 4, md: 8 } }}>
      <Typography variant="h5" gutterBottom>
        Stock Movements
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} alignItems="center">
        <TextField
          label="Start Date"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="End Date"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Autocomplete
          options={ingredientOptions}
          getOptionLabel={option => option.ingredient_name}
          value={ingredient}
          onChange={(_, v) => setIngredient(v)}
          sx={{ minWidth: 220 }}
          renderInput={params => <TextField {...params} label="Ingredient" />}
          isOptionEqualToValue={(o, v) => o.ingredient_id === v.ingredient_id}
        />
      </Stack>
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        <Chip
          label="All Types"
          color={!typeFilter ? 'primary' : 'default'}
          onClick={() => setTypeFilter(null)}
        />
        {allTypes.map(type => (
          <Chip
            key={type}
            label={type}
            color={typeFilter === type ? 'primary' : 'default'}
            onClick={() => setTypeFilter(type)}
            sx={{ textTransform: 'capitalize' }}
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
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Lot</th>
                <th>Notes</th>
                <th>Running Balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((m, i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      m.quantity < 0
                        ? 'var(--stock-move-out-bg, rgba(255, 77, 77, 0.08))'
                        : 'var(--stock-move-in-bg, rgba(76, 175, 80, 0.08))',
                  }}
                >
                  <td>{new Date(m.date).toLocaleDateString()}</td>
                  <td>
                    <Chip
                      label={m.type}
                      size="small"
                      color={m.quantity < 0 ? 'error' : 'success'}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </td>
                  <td>{m.ingredient_name}</td>
                  <td style={{ color: m.quantity < 0 ? '#d32f2f' : '#388e3c', fontWeight: 600 }}>
                    {m.quantity}
                  </td>
                  <td>{m.unit}</td>
                  <td>{m.lot_id ?? '-'}</td>
                  <td>{m.notes ?? ''}</td>
                  <td style={{ fontWeight: 600 }}>{m.running_balance ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Paper>
  );
}
