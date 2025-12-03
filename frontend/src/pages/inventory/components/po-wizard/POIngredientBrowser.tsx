import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Badge,
  IconButton,
  TextField,
  Divider,
  Alert,
  Fade,
  Grow,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import type {
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../../../../interfaces/inventory';

// Status color mapping
const statusColors: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
  critical: 'error',
  low: 'warning',
  warning: 'info',
  ok: 'success',
};

interface POIngredientBrowserProps {
  stockLevels: IngredientStockLevel[];
  stockLoading: boolean;
  selectedIngredient: IngredientStockLevel | null;
  setSelectedIngredient: (ing: IngredientStockLevel | null) => void;
  ingredientSuppliers: IngredientSupplierOption[];
  suppliersLoading: boolean;
  ingredientSupplier: IngredientSupplierOption | null;
  setIngredientSupplier: (sup: IngredientSupplierOption | null) => void;
  ingredientQty: number;
  setIngredientQty: (qty: number) => void;
}

export default function POIngredientBrowser({
  stockLevels,
  stockLoading,
  selectedIngredient,
  setSelectedIngredient,
  ingredientSuppliers,
  suppliersLoading,
  ingredientSupplier,
  setIngredientSupplier,
  ingredientQty,
  setIngredientQty,
}: POIngredientBrowserProps) {
  // Sort stock levels by status (critical first)
  const sortedStockLevels = React.useMemo(() => {
    const priority: Record<string, number> = { critical: 0, low: 1, warning: 2, ok: 3 };
    return [...stockLevels].sort((a, b) => (priority[a.status] ?? 4) - (priority[b.status] ?? 4));
  }, [stockLevels]);

  return (
    <Fade in timeout={300}>
      <Box>
        {!selectedIngredient ? (
          <>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Select an Ingredient to Order
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Items are sorted by stock status - critical items first
            </Typography>

            {stockLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {sortedStockLevels.map(ing => (
                  <Paper
                    key={ing.ingredient_id}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: 2,
                      borderColor: 'transparent',
                      '&:hover': {
                        borderColor: statusColors[ing.status] + '.main',
                        bgcolor: alpha(
                          ing.status === 'critical'
                            ? '#f44336'
                            : ing.status === 'low'
                              ? '#ff9800'
                              : '#2196f3',
                          0.05
                        ),
                      },
                    }}
                    variant="outlined"
                    onClick={() => setSelectedIngredient(ing)}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={500}>
                            {ing.ingredient_name}
                          </Typography>
                          <Chip
                            size="small"
                            label={ing.status.toUpperCase()}
                            color={statusColors[ing.status]}
                          />
                          <Chip size="small" label={ing.abc_class} variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Stock: {ing.current_stock.toFixed(1)} {ing.unit} • Reorder at:{' '}
                          {ing.reorder_point.toFixed(1)} {ing.unit}
                        </Typography>
                      </Box>
                      <Badge badgeContent={ing.supplier_count} color="primary">
                        <LocalShippingIcon color="action" />
                      </Badge>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            )}
          </>
        ) : (
          <>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                setSelectedIngredient(null);
                setIngredientSupplier(null);
                setIngredientQty(1);
              }}
              sx={{ mb: 2 }}
            >
              Back to Ingredients
            </Button>

            <Paper sx={{ p: 3, mb: 3, bgcolor: 'background.default' }} variant="outlined">
              <Stack direction="row" alignItems="center" spacing={2}>
                <InventoryIcon sx={{ fontSize: 40 }} color="action" />
                <Box>
                  <Typography variant="h6">{selectedIngredient.ingredient_name}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip
                      size="small"
                      label={selectedIngredient.status.toUpperCase()}
                      color={statusColors[selectedIngredient.status]}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Current Stock: {selectedIngredient.current_stock.toFixed(1)}{' '}
                      {selectedIngredient.unit}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Choose Supplier
            </Typography>

            {suppliersLoading ? (
              <CircularProgress size={24} />
            ) : ingredientSuppliers.length === 0 ? (
              <Alert severity="warning">No suppliers configured for this ingredient.</Alert>
            ) : (
              <Stack spacing={1}>
                {ingredientSuppliers.map(sup => (
                  <Paper
                    key={sup.supplier_id}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: 2,
                      borderColor:
                        ingredientSupplier?.supplier_id === sup.supplier_id
                          ? 'primary.main'
                          : 'transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.light',
                      },
                    }}
                    variant="outlined"
                    onClick={() => setIngredientSupplier(sup)}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle1" fontWeight={500}>
                            {sup.supplier_name}
                          </Typography>
                          {sup.is_preferred && (
                            <Chip size="small" label="Preferred" color="primary" />
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Lead time: {sup.lead_time_days} days • Pack: {sup.pack_size}{' '}
                          {sup.pack_unit}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary.main">
                          ${sup.unit_price.toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          per {sup.pack_unit}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}

            {ingredientSupplier && (
              <Grow in>
                <Paper sx={{ p: 3, mt: 3, bgcolor: 'primary.50' }} variant="outlined">
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Order Quantity
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <IconButton
                      onClick={() => setIngredientQty(Math.max(1, ingredientQty - 1))}
                      color="primary"
                    >
                      <RemoveIcon />
                    </IconButton>
                    <TextField
                      value={ingredientQty}
                      onChange={e => setIngredientQty(Math.max(1, Number(e.target.value) || 1))}
                      type="number"
                      size="small"
                      sx={{ width: 100 }}
                      inputProps={{ min: 1, style: { textAlign: 'center' } }}
                    />
                    <IconButton onClick={() => setIngredientQty(ingredientQty + 1)} color="primary">
                      <AddIcon />
                    </IconButton>
                    <Typography variant="body1" color="text.secondary">
                      × {ingredientSupplier.pack_size} {ingredientSupplier.pack_unit} ={' '}
                      <strong>{ingredientQty * ingredientSupplier.pack_size}</strong>{' '}
                      {ingredientSupplier.pack_unit}
                    </Typography>
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body1">Total</Typography>
                    <Typography variant="h5" color="primary.main" fontWeight={600}>
                      $
                      {(
                        ingredientQty *
                        ingredientSupplier.pack_size *
                        ingredientSupplier.unit_price
                      ).toFixed(2)}
                    </Typography>
                  </Stack>
                </Paper>
              </Grow>
            )}
          </>
        )}
      </Box>
    </Fade>
  );
}
