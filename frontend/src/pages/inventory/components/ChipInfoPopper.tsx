import React from 'react';
import {
  Popper,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Button,
  Fade,
  ClickAwayListener,
  Stack,
} from '@mui/material';
import {
  useLotInfo,
  useUsedUsageLogs,
  useWastedUsageLogs,
} from '../hooks/useInventoryTable';
import { LotInfo, UsageLog } from '../../../interfaces/inventory';

interface ChipInfoPopperProps {
  anchorEl: HTMLElement | null;
  lotId: number | null;
  type: 'added' | 'used' | 'wasted' | null;
  open: boolean;
  onClose: () => void;
}

const ChipInfoPopper: React.FC<ChipInfoPopperProps> = ({
  anchorEl,
  lotId,
  type,
  open,
  onClose,
}) => {
  const { lotInfo, loading: loadingLot } = useLotInfo(type === 'added' ? lotId : null);
  const { usedLogs, loading: loadingUsed } = useUsedUsageLogs(type === 'used' ? lotId : null);
  const { wastedLogs, loading: loadingWasted } = useWastedUsageLogs(
    type === 'wasted' ? lotId : null
  );

  if (!open || !anchorEl) {
    return null;
  }

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="right-start"
      style={{ zIndex: 1400 }}
      transition
    >
      {({ TransitionProps }) => (
        <ClickAwayListener onClickAway={onClose}>
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              sx={{
                p: 3,
                maxWidth: 360,
              }}
              elevation={6}
            >
              {type === 'added' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Supplier Info
                  </Typography>
                  {loadingLot ? (
                    <CircularProgress size={24} />
                  ) : lotInfo ? (
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        <strong>Supplier:</strong> {(lotInfo as LotInfo).supplier?.supplier_name || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Packs:</strong> {(lotInfo as LotInfo).supplier?.pack_description || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Cost/Unit:</strong> ${(lotInfo as LotInfo).supplier?.cost_per_unit || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> {(lotInfo as LotInfo).status}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Spoilage Expected:</strong> {(lotInfo as LotInfo).spoilage_expected_date || 'N/A'}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography>No supplier info available.</Typography>
                  )}
                </Box>
              )}

              {type === 'used' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Used Logs
                  </Typography>
                  {loadingUsed ? (
                    <CircularProgress size={24} />
                  ) : usedLogs.length > 0 ? (
                    (usedLogs as UsageLog[]).map((log) => (
                      <Paper
                        key={log.usage_id}
                        variant="outlined"
                        sx={{ mb: 2, p: 1.5 }}
                      >
                        <Typography variant="body2">
                          <strong>Date:</strong> {log.used_date}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Qty Used:</strong> {log.used_quantity} {log.unit}
                        </Typography>
                        <Typography variant="body2">
                          <strong>From:</strong> {log.usage_type}
                        </Typography>
                      </Paper>
                    ))
                  ) : (
                    <Typography>No usage logs available.</Typography>
                  )}
                </Box>
              )}

              {type === 'wasted' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Waste Logs
                  </Typography>
                  {loadingWasted ? (
                    <CircularProgress size={24} />
                  ) : wastedLogs.length > 0 ? (
                    (wastedLogs as UsageLog[]).map((log) => (
                      <Paper
                        key={log.usage_id}
                        variant="outlined"
                        sx={{ mb: 2, p: 1.5 }}
                      >
                        <Typography variant="body2">
                          <strong>Date:</strong> {log.used_date}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Qty Wasted:</strong> {log.used_quantity} {log.unit}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Reason:</strong> {log.usage_type}
                        </Typography>
                      </Paper>
                    ))
                  ) : (
                    <Typography>No waste logs available.</Typography>
                  )}
                </Box>
              )}

              <Stack direction="row" justifyContent="flex-end" mt={2}>
                <Button size="small" variant="outlined" onClick={onClose}>
                  Close
                </Button>
              </Stack>
            </Paper>
          </Fade>
        </ClickAwayListener>
      )}
    </Popper>
  );
};

export default ChipInfoPopper;
