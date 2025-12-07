import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  Typography,
} from '@mui/material';
import type { LotBreakdown } from '../../../interfaces/inventory';

interface LotAdjustDialogProps {
  open: boolean;
  onClose: () => void;
  inventoryId: number;
  inventoryName: string;
  unit: string;
  inventoryQuantity: number;
  lots: LotBreakdown[];
  defaultLotId?: number | null;
  loading?: boolean;
  onSubmit: (payload: {
    inventory_id: number;
    lot_id: number;
    adjustment_quantity: number;
    usage_type: string;
    notes?: string;
  }) => Promise<void>;
}

const usageOptions = [
  { value: 'manual_addition', label: 'Add to inventory' },
  { value: 'manual_adjustment', label: 'Subtract (adjustment)' },
  { value: 'waste', label: 'Waste' },
  { value: 'spoilage', label: 'Spoilage' },
];

export const LotAdjustDialog: React.FC<LotAdjustDialogProps> = ({
  open,
  onClose,
  inventoryId,
  inventoryName,
  unit,
  inventoryQuantity,
  lots,
  defaultLotId,
  loading = false,
  onSubmit,
}) => {
  const [lotId, setLotId] = useState<number | null>(defaultLotId ?? null);
  const [usageType, setUsageType] = useState<string>('manual_adjustment');
  const [quantity, setQuantity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLotId(defaultLotId ?? (lots.length > 0 ? lots[0].lot_id : null));
      setQuantity('');
      setUsageType('manual_adjustment');
      setNotes('');
      setError(null);
    }
  }, [open, defaultLotId, lots]);

  const selectedLot = useMemo(() => lots.find(l => l.lot_id === lotId) || null, [lots, lotId]);
  const isSubtract = usageType !== 'manual_addition';

  const handleSubmit = async () => {
    if (!lotId) {
      setError('Select a lot to adjust.');
      return;
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    if (isSubtract && selectedLot && qty > selectedLot.remaining_quantity) {
      setError('Cannot subtract more than the selected lot has remaining.');
      return;
    }

    try {
      await onSubmit({
        inventory_id: inventoryId,
        lot_id: lotId,
        adjustment_quantity: qty,
        usage_type: usageType,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to adjust inventory.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Adjust stock for {inventoryName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Adjustments apply to the selected lot only. Choose the correct lot to avoid touching
            newer stock.
          </Typography>

          <FormControl fullWidth>
            <InputLabel id="lot-select-label">Lot</InputLabel>
            <Select
              labelId="lot-select-label"
              value={lotId ?? ''}
              label="Lot"
              onChange={e => setLotId(Number(e.target.value))}
            >
              {lots.map(lot => (
                <MenuItem key={lot.lot_id} value={lot.lot_id}>
                  Lot #{lot.lot_id} — {lot.remaining_quantity} / {lot.quantity}{' '}
                  {lot.supplier_unit || unit} left
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label={`Quantity (${unit})`}
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            fullWidth
            inputProps={{ min: 0, step: '0.01' }}
          />

          <FormControl fullWidth>
            <InputLabel id="usage-type-label">Usage type</InputLabel>
            <Select
              labelId="usage-type-label"
              value={usageType}
              label="Usage type"
              onChange={e => setUsageType(e.target.value)}
            >
              {usageOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Inventory on hand: {inventoryQuantity} {unit}
            </Typography>
            {selectedLot && (
              <Typography variant="body2" color="text.secondary">
                Lot #{selectedLot.lot_id} remaining: {selectedLot.remaining_quantity}{' '}
                {selectedLot.supplier_unit || unit}
              </Typography>
            )}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || lots.length === 0}>
          {loading ? 'Saving...' : 'Submit adjustment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LotAdjustDialog;
