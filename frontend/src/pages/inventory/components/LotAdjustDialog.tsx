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
import type { InventoryDeductionDiscrepancy, LotBreakdown } from '../../../interfaces/inventory';

type LotAdjustDialogMode = 'lot-adjust' | 'review';

interface LotAdjustDialogProps {
  open: boolean;
  onClose: () => void;
  mode?: LotAdjustDialogMode;
  inventoryId: number;
  inventoryName: string;
  unit: string;
  inventoryQuantity: number;
  lots: LotBreakdown[];
  defaultLotId?: number | null;
  reviewDiscrepancy?: InventoryDeductionDiscrepancy | null;
  loading?: boolean;
  onSubmitAdjustment: (payload: {
    inventory_id: number;
    lot_id: number;
    adjustment_quantity: number;
    usage_type: string;
    notes?: string;
  }) => Promise<void>;
  onSubmitCount: (payload: {
    inventory_id: number;
    counted_quantity: number;
    lot_id?: number | null;
    reason?: string | null;
    notes?: string;
  }) => Promise<void>;
}

const usageOptions = [
  { value: 'manual_addition', label: 'Add to inventory' },
  { value: 'manual_adjustment', label: 'Subtract (adjustment)' },
  { value: 'waste', label: 'Waste' },
  { value: 'spoilage', label: 'Spoilage' },
];

const reviewReasonOptions = [
  { value: 'count_correction', label: 'Count correction' },
  { value: 'waste_not_logged', label: 'Waste not logged' },
  { value: 'receipt_not_entered', label: 'Receipt not entered' },
  { value: 'prep_variance', label: 'Prep variance' },
  { value: 'other', label: 'Other' },
];

export const LotAdjustDialog: React.FC<LotAdjustDialogProps> = ({
  open,
  onClose,
  mode = 'lot-adjust',
  inventoryId,
  inventoryName,
  unit,
  inventoryQuantity,
  lots,
  defaultLotId,
  reviewDiscrepancy,
  loading = false,
  onSubmitAdjustment,
  onSubmitCount,
}) => {
  const [lotId, setLotId] = useState<number | null>(defaultLotId ?? null);
  const [usageType, setUsageType] = useState<string>('manual_adjustment');
  const [quantity, setQuantity] = useState<string>('');
  const [countedQuantity, setCountedQuantity] = useState<string>('');
  const [reason, setReason] = useState<string>('count_correction');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLotId(defaultLotId ?? (lots.length > 0 ? lots[0].lot_id : null));
      setQuantity('');
      setCountedQuantity('');
      setUsageType('manual_adjustment');
      setReason('count_correction');
      setNotes('');
      setError(null);
    }
  }, [open, defaultLotId, lots]);

  const selectedLot = useMemo(() => lots.find(l => l.lot_id === lotId) || null, [lots, lotId]);
  const isSubtract = usageType !== 'manual_addition';

  const handleSubmit = async () => {
    try {
      if (mode === 'review') {
        const nextCount = Number(countedQuantity);
        if (!Number.isFinite(nextCount) || nextCount < 0) {
          setError('Current counted stock must be zero or greater.');
          return;
        }

        await onSubmitCount({
          inventory_id: inventoryId,
          counted_quantity: nextCount,
          lot_id: defaultLotId ?? undefined,
          reason,
          notes: notes.trim() || undefined,
        });
      } else {
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

        await onSubmitAdjustment({
          inventory_id: inventoryId,
          lot_id: lotId,
          adjustment_quantity: qty,
          usage_type: usageType,
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update inventory.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {mode === 'review' ? 'Set current stock' : `Adjust stock for ${inventoryName}`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {mode === 'review' ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Count what is physically on hand right now. The system will compare it to the
                quantity on hand in inventory and reconcile automatically.
              </Typography>

              <Alert severity="info" variant="outlined">
                Enter the current stock you have now. You do not need to calculate what should be
                added or removed.
              </Alert>

              {reviewDiscrepancy && (
                <Alert severity="warning" variant="outlined">
                  Quantity on hand in inventory: {reviewDiscrepancy.current_quantity_on_hand}{' '}
                  {unit}. Quantity needed for the failed deduction:{' '}
                  {reviewDiscrepancy.required_quantity} {unit}. Shortfall:{' '}
                  {reviewDiscrepancy.shortfall_quantity} {unit}.
                </Alert>
              )}

              <TextField
                label={`Current counted stock (${unit})`}
                type="number"
                value={countedQuantity}
                onChange={e => setCountedQuantity(e.target.value)}
                fullWidth
                inputProps={{ min: 0, step: '0.01' }}
              />

              <FormControl fullWidth>
                <InputLabel id="review-reason-label">Reason</InputLabel>
                <Select
                  labelId="review-reason-label"
                  value={reason}
                  label="Reason"
                  onChange={e => setReason(e.target.value)}
                >
                  {reviewReasonOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          ) : (
            <>
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
            </>
          )}

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
              Quantity on hand in inventory: {inventoryQuantity} {unit}
            </Typography>
            {mode === 'lot-adjust' && selectedLot && (
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
          {loading ? 'Saving...' : mode === 'review' ? 'Set current stock' : 'Submit adjustment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LotAdjustDialog;
