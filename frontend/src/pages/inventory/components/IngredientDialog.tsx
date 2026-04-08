import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Grid,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

const IngredientDialog = ({ open, onClose, ingredient, setIngredient, onSave }) => {
  const handleChange =
    (key, transform = v => v) =>
    e =>
      setIngredient({ ...ingredient, [key]: transform(e.target.value) });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Typography variant="overline" color="text.secondary">
          Ingredient supplier row
        </Typography>
        <Typography variant="h5" fontWeight={800}>
          {ingredient?.ingredient_supplier_id
            ? 'Edit Ingredient Details'
            : 'Add Ingredient Details'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Capture the purchasing fields that drive reorder review and purchase-order creation.
        </Typography>
      </Box>
      <DialogContent dividers>
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Identity and unit setup
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Ingredient ID"
                    fullWidth
                    value={ingredient?.ingredient_id || ''}
                    onChange={handleChange('ingredient_id')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Unit"
                    fullWidth
                    value={ingredient?.unit || ''}
                    onChange={handleChange('unit')}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Supplier Priority"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    value={ingredient?.supplier_priority ?? ''}
                    onChange={handleChange('supplier_priority', v =>
                      v === '' ? null : parseInt(v)
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Cost and fulfillment
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Cost Per Unit"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                    value={ingredient?.cost_per_unit ?? 0}
                    onChange={handleChange('cost_per_unit', parseFloat)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Lead Time (days)"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    value={ingredient?.lead_time_days ?? 0}
                    onChange={handleChange('lead_time_days', parseInt)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Shelf Life (days)"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    value={ingredient?.shelf_life_days ?? ''}
                    onChange={handleChange('shelf_life_days', v => (v === '' ? null : parseInt(v)))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Spoilage Rate (%)"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0, max: 100 }}
                    value={ingredient?.spoilage_rate ?? 0}
                    onChange={handleChange('spoilage_rate', parseFloat)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Min Order Quantity"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    value={ingredient?.min_order_quantity ?? ''}
                    onChange={handleChange('min_order_quantity', v =>
                      v === '' ? null : parseInt(v)
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Packaging and preference
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Pack Size"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    value={ingredient?.pack_size ?? ''}
                    onChange={handleChange('pack_size', v => (v === '' ? null : parseInt(v)))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Quantity Per Pack Item"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    value={ingredient?.quantity_per_pack_item ?? ''}
                    onChange={handleChange('quantity_per_pack_item', v =>
                      v === '' ? null : parseInt(v)
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={ingredient?.preferred ?? false}
                        onChange={e =>
                          setIngredient({
                            ...ingredient,
                            preferred: e.target.checked,
                          })
                        }
                      />
                    }
                    label={
                      ingredient?.preferred
                        ? 'Preferred supplier option'
                        : 'Standard supplier option'
                    }
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IngredientDialog;
