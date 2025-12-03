import React from 'react';
import { Box, Paper, Stack, Typography, TextField, Grid, Divider, Fade } from '@mui/material';
import dayjs from 'dayjs';
import type {
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../../../../interfaces/inventory';

interface POIngredientReviewProps {
  selectedIngredient: IngredientStockLevel;
  ingredientSupplier: IngredientSupplierOption;
  ingredientQty: number;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
}

export default function POIngredientReview({
  selectedIngredient,
  ingredientSupplier,
  ingredientQty,
  orderNotes,
  setOrderNotes,
}: POIngredientReviewProps) {
  const total = ingredientQty * ingredientSupplier.pack_size * ingredientSupplier.unit_price;

  return (
    <Fade in timeout={300}>
      <Box>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          Review Your Order
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Ingredient
              </Typography>
              <Typography variant="h6">{selectedIngredient.ingredient_name}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Supplier
              </Typography>
              <Typography variant="h6">{ingredientSupplier.supplier_name}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Quantity
              </Typography>
              <Typography variant="h6">
                {ingredientQty * ingredientSupplier.pack_size} {ingredientSupplier.pack_unit}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Unit Price
              </Typography>
              <Typography variant="h6">${ingredientSupplier.unit_price.toFixed(2)}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Lead Time
              </Typography>
              <Typography variant="h6">{ingredientSupplier.lead_time_days} days</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">
                Expected Delivery
              </Typography>
              <Typography variant="h6">
                {dayjs().add(ingredientSupplier.lead_time_days, 'day').format('MMM D')}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Total</Typography>
            <Typography variant="h4" color="primary.main" fontWeight={600}>
              ${total.toFixed(2)}
            </Typography>
          </Stack>
        </Paper>

        <TextField
          fullWidth
          label="Order Notes (optional)"
          value={orderNotes}
          onChange={e => setOrderNotes(e.target.value)}
          multiline
          rows={2}
        />
      </Box>
    </Fade>
  );
}
