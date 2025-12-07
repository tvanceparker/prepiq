import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Grid,
  Divider,
  Fade,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { IngredientCartItem } from './types';

interface POIngredientReviewProps {
  cartItems: IngredientCartItem[];
  onUpdateCartItemQty: (ingredientId: number, supplierId: number, qtyPacks: number) => void;
  onRemoveCartItem: (ingredientId: number, supplierId: number) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
}

export default function POIngredientReview({
  cartItems,
  onUpdateCartItemQty,
  onRemoveCartItem,
  orderNotes,
  setOrderNotes,
}: POIngredientReviewProps) {
  const grouped = React.useMemo(() => {
    const map = new Map<
      number,
      { supplierName: string; leadTime: number; items: IngredientCartItem[] }
    >();
    cartItems.forEach(item => {
      if (!map.has(item.supplier.supplier_id)) {
        map.set(item.supplier.supplier_id, {
          supplierName: item.supplier.supplier_name,
          leadTime: item.supplier.lead_time_days,
          items: [],
        });
      }
      map.get(item.supplier.supplier_id)!.items.push(item);
    });
    return Array.from(map.entries()).map(([supplierId, payload]) => ({
      supplierId,
      ...payload,
    }));
  }, [cartItems]);

  const totals = React.useMemo(() => {
    const supplierSet = new Set<number>();
    let total = 0;
    let itemCount = 0;
    cartItems.forEach(item => {
      supplierSet.add(item.supplier.supplier_id);
      itemCount += 1;
      total += item.qtyPacks * item.supplier.pack_size * item.supplier.unit_price;
    });
    return { supplierCount: supplierSet.size, itemCount, total };
  }, [cartItems]);

  return (
    <Fade in timeout={300}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Review Your Order
        </Typography>

        <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Items
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {totals.itemCount}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Suppliers
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {totals.supplierCount}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                ${totals.total.toFixed(2)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Stack spacing={2} sx={{ maxHeight: 320, overflow: 'auto', pr: 1 }}>
          {grouped.map(group => (
            <Paper key={group.supplierId} sx={{ p: 2 }} variant="outlined">
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {group.supplierName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lead time: {group.leadTime}d
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {group.items.map(item => {
                  const lineTotal =
                    item.qtyPacks * item.supplier.pack_size * item.supplier.unit_price;
                  return (
                    <Paper
                      key={`${item.ingredient.ingredient_id}-${item.supplier.supplier_id}`}
                      sx={{ p: 1.5, bgcolor: 'background.default' }}
                      variant="outlined"
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {item.ingredient.ingredient_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.qtyPacks * item.supplier.pack_size} {item.supplier.pack_unit}
                          </Typography>
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              onUpdateCartItemQty(
                                item.ingredient.ingredient_id,
                                item.supplier.supplier_id,
                                Math.max(1, item.qtyPacks - 1)
                              )
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ minWidth: 32, textAlign: 'center' }}>
                            {item.qtyPacks}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              onUpdateCartItemQty(
                                item.ingredient.ingredient_id,
                                item.supplier.supplier_id,
                                item.qtyPacks + 1
                              )
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                        <Typography variant="body2" sx={{ minWidth: 90, textAlign: 'right' }}>
                          ${lineTotal.toFixed(2)}
                        </Typography>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            onRemoveCartItem(
                              item.ingredient.ingredient_id,
                              item.supplier.supplier_id
                            )
                          }
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Paper>
          ))}
        </Stack>

        <TextField
          fullWidth
          label="Order Notes (optional)"
          value={orderNotes}
          onChange={e => setOrderNotes(e.target.value)}
          multiline
          rows={2}
          sx={{ mt: 2 }}
        />
      </Box>
    </Fade>
  );
}
