import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Chip,
  Badge,
  IconButton,
  TextField,
  Alert,
  Fade,
  alpha,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import type {
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../../../../interfaces/inventory';
import type { IngredientCartItem } from './types';

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
  cartItems: IngredientCartItem[];
  onAddToCart: (item: IngredientCartItem) => void;
  onUpdateCartItemQty: (ingredientId: number, supplierId: number, qtyPacks: number) => void;
  onRemoveCartItem: (ingredientId: number, supplierId: number) => void;
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
  cartItems,
  onAddToCart,
  onUpdateCartItemQty,
  onRemoveCartItem,
}: POIngredientBrowserProps) {
  const [searchText, setSearchText] = React.useState('');

  // Sort stock levels by status (critical first)
  const sortedStockLevels = React.useMemo(() => {
    const priority: Record<string, number> = { critical: 0, low: 1, warning: 2, ok: 3 };
    return [...stockLevels].sort((a, b) => (priority[a.status] ?? 4) - (priority[b.status] ?? 4));
  }, [stockLevels]);

  const filteredStockLevels = React.useMemo(() => {
    const normalized = searchText.trim().toLowerCase();
    if (!normalized) return sortedStockLevels;

    return sortedStockLevels.filter(ingredient =>
      ingredient.ingredient_name.toLowerCase().includes(normalized)
    );
  }, [searchText, sortedStockLevels]);

  const supplierPreviewCount = selectedIngredient?.supplier_count || 0;

  return (
    <Fade in timeout={300}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Browse Ingredients
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Keep the order visible on the right while comparing suppliers and adjusting quantities.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(250px, 0.95fr) minmax(0, 1.15fr)' },
            gap: 2,
            minHeight: 420,
          }}
        >
          <Paper
            variant="outlined"
            sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            <TextField
              size="small"
              placeholder="Search ingredients"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              sx={{ mb: 1.5 }}
            />

            {stockLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={1} sx={{ overflow: 'auto', pr: 0.5 }}>
                {filteredStockLevels.map(ingredient => {
                  const selected = selectedIngredient?.ingredient_id === ingredient.ingredient_id;

                  return (
                    <Paper
                      key={ingredient.ingredient_id}
                      variant="outlined"
                      onClick={() => {
                        setSelectedIngredient(ingredient);
                        setIngredientSupplier(null);
                        setIngredientQty(1);
                      }}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderWidth: 2,
                        borderColor: selected
                          ? `${statusColors[ingredient.status]}.main`
                          : 'divider',
                        bgcolor: selected
                          ? alpha(
                              ingredient.status === 'critical'
                                ? '#f44336'
                                : ingredient.status === 'low'
                                  ? '#ff9800'
                                  : ingredient.status === 'warning'
                                    ? '#2196f3'
                                    : '#4caf50',
                              0.08
                            )
                          : 'background.paper',
                        '&:hover': {
                          borderColor: `${statusColors[ingredient.status]}.main`,
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ flexWrap: 'wrap' }}
                          >
                            <Typography variant="subtitle2" fontWeight={700}>
                              {ingredient.ingredient_name}
                            </Typography>
                            <Chip
                              size="small"
                              label={ingredient.status.toUpperCase()}
                              color={statusColors[ingredient.status]}
                            />
                            <Chip size="small" label={ingredient.abc_class} variant="outlined" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {ingredient.current_stock.toFixed(1)} {ingredient.unit} on hand
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Reorder point: {ingredient.reorder_point.toFixed(1)} {ingredient.unit}
                          </Typography>
                        </Box>
                        <Badge badgeContent={ingredient.supplier_count} color="primary">
                          <LocalShippingIcon color="action" />
                        </Badge>
                      </Stack>
                    </Paper>
                  );
                })}

                {!filteredStockLevels.length && (
                  <Alert severity="info">No ingredients match that search.</Alert>
                )}
              </Stack>
            )}
          </Paper>

          <Paper
            variant="outlined"
            sx={{ p: 2, display: 'flex', flexDirection: 'column', minHeight: 0 }}
          >
            {!selectedIngredient ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  color: 'text.secondary',
                  px: 3,
                }}
              >
                <Box>
                  <InventoryIcon sx={{ fontSize: 42, mb: 1, opacity: 0.45 }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                    Select an ingredient
                  </Typography>
                  <Typography variant="body2">
                    Choose from the list to compare suppliers and add quantities without leaving
                    this builder.
                  </Typography>
                </Box>
              </Box>
            ) : (
              <>
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }} variant="outlined">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <InventoryIcon sx={{ fontSize: 36 }} color="action" />
                    <Box sx={{ flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="h6">{selectedIngredient.ingredient_name}</Typography>
                        <Chip
                          size="small"
                          label={selectedIngredient.status.toUpperCase()}
                          color={statusColors[selectedIngredient.status]}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Current stock: {selectedIngredient.current_stock.toFixed(1)}{' '}
                        {selectedIngredient.unit}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Reorder point: {selectedIngredient.reorder_point.toFixed(1)}{' '}
                        {selectedIngredient.unit} • {supplierPreviewCount} supplier
                        {supplierPreviewCount === 1 ? '' : 's'} available
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Choose a supplier and quantity
                </Typography>

                {suppliersLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : ingredientSuppliers.length === 0 ? (
                  <Alert severity="warning">No suppliers configured for this ingredient.</Alert>
                ) : (
                  <Stack spacing={1.5} sx={{ overflow: 'auto', pr: 0.5 }}>
                    {ingredientSuppliers.map(supplier => {
                      const selected = ingredientSupplier?.supplier_id === supplier.supplier_id;
                      const existingQty =
                        cartItems.find(
                          item =>
                            item.ingredient.ingredient_id === selectedIngredient.ingredient_id &&
                            item.supplier.supplier_id === supplier.supplier_id
                        )?.qtyPacks || 0;

                      return (
                        <Paper
                          key={supplier.supplier_id}
                          variant="outlined"
                          onClick={() => {
                            setIngredientSupplier(supplier);
                            setIngredientQty(Math.max(existingQty || 1, 1));
                          }}
                          sx={{
                            p: 2,
                            cursor: 'pointer',
                            borderWidth: 2,
                            borderColor: selected ? 'primary.main' : 'divider',
                            '&:hover': { borderColor: 'primary.light' },
                          }}
                        >
                          <Stack spacing={1.5}>
                            <Stack direction="row" justifyContent="space-between" spacing={2}>
                              <Box>
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                  sx={{ mb: 0.5 }}
                                >
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {supplier.supplier_name}
                                  </Typography>
                                  {supplier.is_preferred && (
                                    <Chip size="small" label="Preferred" color="primary" />
                                  )}
                                  {existingQty > 0 && (
                                    <Chip
                                      size="small"
                                      label={`In draft: ${existingQty}`}
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                                <Typography variant="body2" color="text.secondary">
                                  Lead time: {supplier.lead_time_days} day
                                  {supplier.lead_time_days === 1 ? '' : 's'} • Minimum:{' '}
                                  {supplier.min_order_quantity} {supplier.pack_unit}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Pack: {supplier.pack_size} {supplier.pack_unit} • Supplier
                                  priority: {supplier.supplier_priority}
                                </Typography>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="h6" color="primary.main">
                                  ${supplier.unit_price.toFixed(2)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  per {supplier.pack_unit}
                                </Typography>
                              </Box>
                            </Stack>

                            {selected && (
                              <Paper
                                variant="outlined"
                                sx={{ p: 1.5, bgcolor: alpha('#1976d2', 0.04) }}
                              >
                                <Stack spacing={1.5}>
                                  <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    alignItems={{ xs: 'stretch', sm: 'center' }}
                                  >
                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                      <IconButton
                                        size="small"
                                        onClick={event => {
                                          event.stopPropagation();
                                          setIngredientQty(Math.max(1, ingredientQty - 1));
                                        }}
                                      >
                                        <RemoveIcon fontSize="small" />
                                      </IconButton>
                                      <TextField
                                        size="small"
                                        type="number"
                                        value={ingredientQty}
                                        onClick={event => event.stopPropagation()}
                                        onChange={event =>
                                          setIngredientQty(
                                            Math.max(1, Number(event.target.value) || 1)
                                          )
                                        }
                                        sx={{ width: 92 }}
                                        inputProps={{ min: 1, style: { textAlign: 'center' } }}
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={event => {
                                          event.stopPropagation();
                                          setIngredientQty(ingredientQty + 1);
                                        }}
                                      >
                                        <AddIcon fontSize="small" />
                                      </IconButton>
                                    </Stack>
                                    <Box sx={{ flex: 1 }}>
                                      <Typography variant="body2" color="text.secondary">
                                        {ingredientQty} pack{ingredientQty === 1 ? '' : 's'} ×{' '}
                                        {supplier.pack_size} {supplier.pack_unit}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Total units: {ingredientQty * supplier.pack_size}{' '}
                                        {supplier.pack_unit}
                                      </Typography>
                                    </Box>
                                    <Typography variant="h6" color="primary.main">
                                      $
                                      {(
                                        ingredientQty *
                                        supplier.pack_size *
                                        supplier.unit_price
                                      ).toFixed(2)}
                                    </Typography>
                                  </Stack>

                                  <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography variant="caption" color="text.secondary">
                                      Add this supplier choice directly into the draft on the right.
                                    </Typography>
                                    <IconButton
                                      color="primary"
                                      onClick={event => {
                                        event.stopPropagation();
                                        onAddToCart({
                                          ingredient: selectedIngredient,
                                          supplier,
                                          qtyPacks: ingredientQty,
                                        });
                                        setIngredientQty(1);
                                      }}
                                    >
                                      <AddIcon />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                              </Paper>
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </>
            )}
          </Paper>
        </Box>
      </Box>
    </Fade>
  );
}
