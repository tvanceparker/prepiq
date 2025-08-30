import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Box,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface Modifier {
  mod_type: string;
  quantity: number;
  note?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  initial: Modifier[];
  onSave: (mods: Modifier[]) => void;
}

const ModifierEditor: React.FC<Props> = ({ open, onClose, initial = [], onSave }) => {
  const [mods, setMods] = useState<Modifier[]>(Array.isArray(initial) ? initial : []);

  const addMod = () => setMods(prev => [...prev, { mod_type: '', quantity: 1, note: '' }]);
  const removeMod = (i: number) => setMods(prev => prev.filter((_, idx) => idx !== i));
  const updateMod = (i: number, changes: Partial<Modifier>) =>
    setMods(prev => prev.map((m, idx) => (idx === i ? { ...m, ...changes } : m)));

  const handleSave = () => {
    onSave(mods.filter(m => (m.mod_type || '').trim().length > 0));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Modifiers</DialogTitle>
      <DialogContent>
        {mods.map((mod, i) => (
          <Box key={i} display="flex" gap={1} alignItems="center" sx={{ mb: 1 }}>
            <TextField
              label="Modifier"
              value={mod.mod_type}
              onChange={e => updateMod(i, { mod_type: e.target.value })}
              fullWidth
            />
            <TextField
              label="Qty"
              type="number"
              value={mod.quantity}
              onChange={e => updateMod(i, { quantity: Number(e.target.value) || 1 })}
              sx={{ width: 100 }}
            />
            <IconButton onClick={() => removeMod(i)} size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}

        <Button startIcon={<AddIcon />} onClick={addMod} sx={{ mt: 1 }}>
          Add Modifier
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModifierEditor;
