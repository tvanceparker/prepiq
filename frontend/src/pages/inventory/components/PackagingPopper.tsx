import React from 'react';
import { Popper, Paper, Typography, Button, Stack, Grow, ClickAwayListener } from '@mui/material';
import QuantityChip from './QuantityChip';
import { LotBreakdown } from '../../../interfaces/inventory';

interface PackagingPopperProps {
  anchorEl: HTMLElement | null;
  lots: LotBreakdown[];
  batchRecipeId: number | null;
  onClose: () => void;
  onChipClick: (event: React.MouseEvent<HTMLDivElement>, lotId: number, type: string) => void;
  onAdjustLot: (lotId: number) => void;
}

const PackagingPopper: React.FC<PackagingPopperProps> = ({
  anchorEl,
  lots,
  batchRecipeId,
  onClose,
  onChipClick,
  onAdjustLot,
}) => {
  const open = Boolean(anchorEl);
  const id = open ? 'packaging-popper' : undefined;

  return (
    <Popper
      id={id}
      open={open}
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ zIndex: 1300 }}
      transition
    >
      {({ TransitionProps }) => (
        <ClickAwayListener onClickAway={onClose}>
          <Grow {...TransitionProps} timeout={200}>
            <Paper
              sx={{
                p: 3,
                maxWidth: 420,
              }}
              elevation={6}
            >
              <Typography variant="h6" mb={2}>
                Packaging Breakdown
              </Typography>
              {lots.length === 0 ? (
                <Typography>No packaging info available</Typography>
              ) : (
                lots.map(lot => (
                  <Paper key={lot.lot_id} variant="outlined" sx={{ mb: 2, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Lot #{lot.lot_id} - {batchRecipeId ? 'Made on' : 'Delivered'}:{' '}
                      {lot.delivery_date}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" mb={1}>
                      <QuantityChip
                        label="Qty"
                        quantity={lot.quantity}
                        type="added"
                        onClick={e => onChipClick(e, lot.lot_id, 'added')}
                      />
                      <QuantityChip
                        label="Used"
                        quantity={lot.used_quantity}
                        type="used"
                        onClick={e => onChipClick(e, lot.lot_id, 'used')}
                      />
                      <QuantityChip
                        label="Wasted"
                        quantity={lot.wasted_quantity}
                        type="wasted"
                        onClick={e => onChipClick(e, lot.lot_id, 'wasted')}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Remaining: {lot.remaining_quantity} {lot.unit || lot.supplier_unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Approx. Packages Remaining: {lot.approx_packages_remaining}
                    </Typography>
                    <Stack direction="row" justifyContent="flex-end" mt={1.5}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onAdjustLot(lot.lot_id)}
                      >
                        Adjust this lot
                      </Button>
                    </Stack>
                  </Paper>
                ))
              )}
              <Stack direction="row" justifyContent="flex-end" mt={2}>
                <Button size="small" variant="outlined" onClick={onClose}>
                  Close
                </Button>
              </Stack>
            </Paper>
          </Grow>
        </ClickAwayListener>
      )}
    </Popper>
  );
};

export default PackagingPopper;
