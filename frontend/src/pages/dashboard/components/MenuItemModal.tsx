import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MuiButton from '../../../components/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Box from '@mui/material/Box';
import Autocomplete from '@mui/material/Autocomplete';
import type { MenuItemDTO } from '../../../interfaces/dashboardInterfaceFrontend';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // support either prop names for compatibility with both JSX and new TSX callers
  initial?: Partial<MenuItemDTO> | null;
  initialData?: Partial<MenuItemDTO> | null;
  onSave?: (m: Partial<MenuItemDTO>) => Promise<void> | void;
  onSubmit?: (m: Partial<MenuItemDTO>) => Promise<void> | void;
  categories?: string[];
}

export default function MenuItemModal({
  isOpen,
  onClose,
  initial = null,
  initialData = null,
  onSave,
  onSubmit,
  categories = [],
}: Props) {
  const seed = initialData ?? initial;

  const [form, setForm] = useState({
    name: '',
    category: '',
    price: '',
    is_active: true,
  });

  const [errors, setErrors] = useState({ name: false, category: false, price: false });

  useEffect(() => {
    if (isOpen) {
      if (seed) {
        setForm({
          name: (seed.name as string) || '',
          category: (seed.category as string) || '',
          price: seed.price !== undefined && seed.price !== null ? String(seed.price) : '',
          is_active: seed.is_active ?? true,
        });
      } else {
        setForm({ name: '', category: '', price: '', is_active: true });
      }
      setErrors({ name: false, category: false, price: false });
    }
  }, [isOpen, seed]);

  const validate = () => {
    const newErrors = {
      name: form.name.trim() === '',
      category: form.category.trim() === '',
      price: form.price.trim() === '' || isNaN(parseFloat(form.price)),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  const handleCategoryChange = (_: any, newValue: any) => {
    setForm((prev) => ({ ...prev, category: newValue || '' }));
    setErrors((prev) => ({ ...prev, category: false }));
  };

  const handleSave = async () => {
    if (!validate()) return;
    const priceNum = parseFloat(form.price);
    const payload = { ...seed, ...form, price: priceNum } as Partial<MenuItemDTO>;
    const caller = onSave ?? onSubmit;
    if (caller) await caller(payload);
    onClose();
  };

  const disableSave = !form.name || !form.category || !form.price || isNaN(parseFloat(form.price));

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{seed ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Name" name="name" value={form.name} onChange={handleChange} required error={errors.name} helperText={errors.name && 'Name is required'} fullWidth />

          <Autocomplete
            freeSolo
            options={categories}
            value={form.category}
            onChange={handleCategoryChange}
            onInputChange={(_, newInputValue) => {
              setForm((prev) => ({ ...prev, category: newInputValue }));
              setErrors((prev) => ({ ...prev, category: false }));
            }}
            renderInput={(params) => (
              <TextField {...params} label="Category" required error={errors.category} helperText={errors.category && 'Category is required'} fullWidth />
            )}
          />

          <TextField label="Price" name="price" type="number" value={form.price} onChange={handleChange} required error={errors.price} helperText={errors.price && 'Valid price is required'} inputProps={{ step: '0.01', min: '0' }} fullWidth />

          <FormControlLabel control={<Checkbox checked={form.is_active} onChange={handleChange} name="is_active" />} label="Active" />
        </Box>
      </DialogContent>

      <DialogActions sx={{ pr: 3, pb: 2 }}>
        <MuiButton onClick={onClose} color="secondary" variant="outlined">
          Cancel
        </MuiButton>
        <MuiButton onClick={handleSave} variant="confirm" disabled={disableSave}>
          Save
        </MuiButton>
      </DialogActions>
    </Dialog>
  );
}
