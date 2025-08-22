import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Typography,
  Button,
} from '@mui/material';

export default function MenuItemBottomSheet({ open, onClose, onSubmit, initial }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setName(initial.name || '');
      setCategory(initial.category || '');
      setPrice(initial.price ?? 0);
      setIsActive(initial.is_active !== false);
    } else {
      setName('');
      setCategory('');
      setPrice(0);
      setIsActive(true);
    }
  }, [initial, open]);

  const handleSubmit = () => {
    onSubmit({ name, category: category || null, price: Number(price), is_active: isActive });
  };

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { p: 2 } }}>
      <Box sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {initial ? 'Edit Menu Item' : 'Add Menu Item'}
        </Typography>
        <Stack spacing={2}>
          <TextField label="Name" value={name} onChange={e => setName(e.target.value)} fullWidth />
          <TextField
            label="Category"
            value={category}
            onChange={e => setCategory(e.target.value)}
            fullWidth
          />
          <TextField
            type="number"
            label="Price"
            value={price}
            onChange={e => setPrice(e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} />}
            label="Active"
          />
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!name || Number(price) < 0}
            >
              {initial ? 'Save' : 'Add'}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
