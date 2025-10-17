import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Box,
  Typography,
  InputAdornment,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchAllSuppliers } from '../../../api/inventory';
import { fetchIngredientNames } from '../../../api/ingredients';
import { PurchaseOrderCreate, PurchaseOrderCreateItem } from '../../../interfaces/inventory';

interface PurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (po: PurchaseOrderCreate) => void;
  cachedDraft?: PurchaseOrderCreate | null;
}

const LOCAL_STORAGE_KEY = 'purchase_order_draft';

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  open,
  onClose,
  onSubmit,
  cachedDraft,
}) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PurchaseOrderCreate>(
    cachedDraft || {
      supplier_id: 0,
      expected_delivery_date: '',
      items: [],
      notes: '',
    }
  );

  // Load suppliers and ingredients
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAllSuppliers().then((res: any) => res.data || res), fetchIngredientNames()])
      .then(([suppliers, ingredients]) => {
        setSuppliers(suppliers);
        setIngredients(ingredients);
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist draft to localStorage
  useEffect(() => {
    if (open) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(form));
    }
  }, [form, open]);

  // Restore draft on open
  useEffect(() => {
    if (open && !cachedDraft) {
      const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (draft) {
        setForm(JSON.parse(draft));
      }
    }
  }, [open, cachedDraft]);

  const handleField = (field: keyof PurchaseOrderCreate, value: any) => {
    setForm((f: PurchaseOrderCreate) => ({ ...f, [field]: value }));
  };

  const handleItemChange = (idx: number, field: keyof PurchaseOrderCreateItem, value: any) => {
    setForm((f: PurchaseOrderCreate) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm((f: PurchaseOrderCreate) => ({
      ...f,
      items: [...f.items, { ingredient_id: 0, quantity_ordered: 1, unit: '', unit_price: 0 }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((f: PurchaseOrderCreate) => ({
      ...f,
      items: f.items.filter((_: any, i: number) => i !== idx),
    }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setForm({ supplier_id: 0, expected_delivery_date: '', items: [], notes: '' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>New Purchase Order</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
              <Select
                value={form.supplier_id}
                onChange={e => handleField('supplier_id', e.target.value)}
                fullWidth
                displayEmpty
              >
                <MenuItem value={0} disabled>
                  Select Supplier
                </MenuItem>
                {suppliers.map(s => (
                  <MenuItem key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Expected Delivery Date"
                type="date"
                value={form.expected_delivery_date || ''}
                onChange={e => handleField('expected_delivery_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <Box>
              <Typography variant="subtitle1" mb={1}>
                Items
              </Typography>
              {form.items.map((item: PurchaseOrderCreateItem, idx: number) => (
                <Stack direction="row" spacing={1} alignItems="center" key={idx} mb={1}>
                  <Select
                    value={item.ingredient_id}
                    onChange={e => handleItemChange(idx, 'ingredient_id', e.target.value)}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value={0} disabled>
                      Select Ingredient
                    </MenuItem>
                    {ingredients.map((ing: any) => (
                      <MenuItem key={ing.ingredient_id} value={ing.ingredient_id}>
                        {ing.ingredient_name}
                      </MenuItem>
                    ))}
                  </Select>
                  <TextField
                    label="Qty"
                    type="number"
                    value={item.quantity_ordered}
                    onChange={e =>
                      handleItemChange(idx, 'quantity_ordered', Number(e.target.value))
                    }
                    sx={{ width: 90 }}
                  />
                  <TextField
                    label="Unit"
                    value={item.unit}
                    onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                    sx={{ width: 80 }}
                  />
                  <TextField
                    label="Unit Price"
                    type="number"
                    value={item.unit_price}
                    onChange={e => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{ width: 110 }}
                  />
                  <IconButton onClick={() => removeItem(idx)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 1 }}>
                Add Item
              </Button>
            </Box>
            <TextField
              label="Notes"
              value={form.notes}
              onChange={e => handleField('notes', e.target.value)}
              fullWidth
              multiline
              minRows={2}
              sx={{ mt: 2 }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !form.supplier_id || form.items.length === 0}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseOrderModal;
