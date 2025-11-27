import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  MonetizationOn as CashIcon,
  LockOpen as OpenIcon,
  Lock as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentDrawerSession,
  getDrawerSessionDetails,
  openCashDrawer,
  closeCashDrawer,
  cashDrawerPayIn,
  cashDrawerPayOut,
  cashDrawerNoSale,
  calculateExpectedCash,
} from '../../../api/pos';
import type { CashDrawerSession } from '../../../interfaces/pos';

interface CashDrawerPanelProps {
  deviceId?: number;
  onSessionChange?: (session: CashDrawerSession | null) => void;
  onClose?: () => void;
}

export default function CashDrawerPanel({
  deviceId,
  onSessionChange,
  onClose,
}: CashDrawerPanelProps) {
  const queryClient = useQueryClient();

  // Dialog states
  const [openDialogOpen, setOpenDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [payInOutDialogOpen, setPayInOutDialogOpen] = useState<'pay_in' | 'pay_out' | null>(null);

  // Form states
  const [openingFloat, setOpeningFloat] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [closingFloat, setClosingFloat] = useState('');
  const [payInOutAmount, setPayInOutAmount] = useState('');
  const [payInOutReason, setPayInOutReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  // Queries
  const {
    data: currentSession,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ['currentDrawerSession', deviceId],
    queryFn: () => getCurrentDrawerSession(deviceId),
  });

  const { data: sessionDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['drawerSessionDetails', currentSession?.session_id],
    queryFn: () => getDrawerSessionDetails(currentSession!.session_id),
    enabled: !!currentSession?.session_id,
  });

  const { data: expectedCash, refetch: refetchExpected } = useQuery({
    queryKey: ['expectedCash', currentSession?.session_id],
    queryFn: () => calculateExpectedCash(currentSession!.session_id),
    enabled: !!currentSession?.session_id && closeDialogOpen,
  });

  // Mutations
  const openMutation = useMutation({
    mutationFn: openCashDrawer,
    onSuccess: session => {
      queryClient.invalidateQueries({ queryKey: ['currentDrawerSession'] });
      setOpenDialogOpen(false);
      setOpeningFloat('');
      onSessionChange?.(session);
    },
  });

  const closeMutation = useMutation({
    mutationFn: closeCashDrawer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentDrawerSession'] });
      setCloseDialogOpen(false);
      setActualCash('');
      setClosingFloat('');
      setCloseNotes('');
      onSessionChange?.(null);
    },
  });

  const payInMutation = useMutation({
    mutationFn: cashDrawerPayIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawerSessionDetails'] });
      setPayInOutDialogOpen(null);
      setPayInOutAmount('');
      setPayInOutReason('');
    },
  });

  const payOutMutation = useMutation({
    mutationFn: cashDrawerPayOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawerSessionDetails'] });
      setPayInOutDialogOpen(null);
      setPayInOutAmount('');
      setPayInOutReason('');
    },
  });

  const noSaleMutation = useMutation({
    mutationFn: cashDrawerNoSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawerSessionDetails'] });
    },
  });

  // Handlers
  const handleOpen = () => {
    const amount = parseFloat(openingFloat);
    if (isNaN(amount) || amount < 0) return;
    openMutation.mutate({ opening_float: amount, device_id: deviceId });
  };

  const handleClose = () => {
    if (!currentSession) return;
    const actual = parseFloat(actualCash);
    const closing = parseFloat(closingFloat) || 0;
    if (isNaN(actual) || actual < 0) return;

    closeMutation.mutate({
      session_id: currentSession.session_id,
      actual_cash: actual,
      closing_float: closing,
      notes: closeNotes || undefined,
    });
  };

  const handlePayInOut = () => {
    if (!currentSession || !payInOutDialogOpen) return;
    const amount = parseFloat(payInOutAmount);
    if (isNaN(amount) || amount <= 0 || !payInOutReason) return;

    const payload = {
      session_id: currentSession.session_id,
      amount,
      reason: payInOutReason,
    };

    if (payInOutDialogOpen === 'pay_in') {
      payInMutation.mutate(payload);
    } else {
      payOutMutation.mutate(payload);
    }
  };

  const handleNoSale = () => {
    if (!currentSession) return;
    noSaleMutation.mutate({ session_id: currentSession.session_id });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  if (sessionLoading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <CashIcon sx={{ mr: 1, color: 'success.main' }} />
          <Typography variant="h6">Cash Drawer</Typography>
          <Box flexGrow={1} />
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => refetchSession()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {onClose && (
            <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
              ✕
            </IconButton>
          )}
        </Box>

        {!currentSession ? (
          // No open session
          <Box textAlign="center" py={3}>
            <Typography color="text.secondary" mb={2}>
              No drawer session open
            </Typography>
            <Button
              variant="contained"
              color="success"
              startIcon={<OpenIcon />}
              onClick={() => setOpenDialogOpen(true)}
            >
              Open Drawer
            </Button>
          </Box>
        ) : (
          // Active session
          <>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Chip label="Open" color="success" size="small" />
              <Typography variant="body2" color="text.secondary">
                Opened: {new Date(currentSession.opened_at).toLocaleTimeString()}
              </Typography>
            </Box>

            {/* Session Summary */}
            {detailsLoading ? (
              <CircularProgress size={20} />
            ) : (
              sessionDetails && (
                <Table size="small" sx={{ mb: 2 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell>Opening Float</TableCell>
                      <TableCell align="right">
                        {formatCurrency(sessionDetails.totals.opening_float)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cash Sales</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        +{formatCurrency(sessionDetails.totals.cash_sales)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Cash Refunds</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        -{formatCurrency(sessionDetails.totals.cash_refunds)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pay-Ins</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        +{formatCurrency(sessionDetails.totals.pay_ins)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Pay-Outs</TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        -{formatCurrency(sessionDetails.totals.pay_outs)}
                      </TableCell>
                    </TableRow>
                    <Divider />
                    <TableRow>
                      <TableCell>
                        <strong>Expected Cash</strong>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(sessionDetails.totals.expected_cash)}</strong>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Card Sales</TableCell>
                      <TableCell align="right">
                        {formatCurrency(sessionDetails.totals.card_sales)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Tips Collected</TableCell>
                      <TableCell align="right">
                        {formatCurrency(sessionDetails.totals.tips)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )
            )}

            {/* Actions */}
            <Box display="flex" gap={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setPayInOutDialogOpen('pay_in')}
              >
                Pay In
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RemoveIcon />}
                onClick={() => setPayInOutDialogOpen('pay_out')}
              >
                Pay Out
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ReceiptIcon />}
                onClick={handleNoSale}
                disabled={noSaleMutation.isPending}
              >
                No Sale
              </Button>
              <Box flexGrow={1} />
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<CloseIcon />}
                onClick={() => {
                  setCloseDialogOpen(true);
                  refetchExpected();
                }}
              >
                Close Drawer
              </Button>
            </Box>
          </>
        )}

        {/* Open Drawer Dialog */}
        <Dialog open={openDialogOpen} onClose={() => setOpenDialogOpen(false)}>
          <DialogTitle>Open Cash Drawer</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Enter the starting cash amount in the drawer.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Opening Float"
              type="number"
              value={openingFloat}
              onChange={e => setOpeningFloat(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleOpen}
              disabled={!openingFloat || openMutation.isPending}
            >
              {openMutation.isPending ? 'Opening...' : 'Open Drawer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Close Drawer Dialog */}
        <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)}>
          <DialogTitle>Close Cash Drawer</DialogTitle>
          <DialogContent>
            {expectedCash && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Expected cash: <strong>{formatCurrency(expectedCash.expected_cash)}</strong>
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              label="Actual Cash Counted"
              type="number"
              value={actualCash}
              onChange={e => setActualCash(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Cash Left for Next Shift (Optional)"
              type="number"
              value={closingFloat}
              onChange={e => setClosingFloat(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Notes (Optional)"
              multiline
              rows={2}
              value={closeNotes}
              onChange={e => setCloseNotes(e.target.value)}
            />
            {actualCash && expectedCash && (
              <Box mt={2}>
                {(() => {
                  const variance = parseFloat(actualCash) - expectedCash.expected_cash;
                  if (Math.abs(variance) < 0.01) {
                    return <Alert severity="success">Cash matches expected amount!</Alert>;
                  } else if (variance > 0) {
                    return (
                      <Alert severity="warning">Cash is over by {formatCurrency(variance)}</Alert>
                    );
                  } else {
                    return (
                      <Alert severity="error">
                        Cash is short by {formatCurrency(Math.abs(variance))}
                      </Alert>
                    );
                  }
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleClose}
              disabled={!actualCash || closeMutation.isPending}
            >
              {closeMutation.isPending ? 'Closing...' : 'Close Drawer'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Pay In/Out Dialog */}
        <Dialog open={!!payInOutDialogOpen} onClose={() => setPayInOutDialogOpen(null)}>
          <DialogTitle>
            {payInOutDialogOpen === 'pay_in' ? 'Pay In (Add Cash)' : 'Pay Out (Remove Cash)'}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {payInOutDialogOpen === 'pay_in'
                ? 'Add cash to the drawer (e.g., from safe for change).'
                : 'Remove cash from the drawer (e.g., safe drop).'}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Amount"
              type="number"
              value={payInOutAmount}
              onChange={e => setPayInOutAmount(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 0.01, step: 0.01 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Reason"
              value={payInOutReason}
              onChange={e => setPayInOutReason(e.target.value)}
              placeholder={
                payInOutDialogOpen === 'pay_in' ? 'e.g., Change fund' : 'e.g., Safe drop'
              }
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayInOutDialogOpen(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handlePayInOut}
              disabled={
                !payInOutAmount ||
                !payInOutReason ||
                payInMutation.isPending ||
                payOutMutation.isPending
              }
            >
              {payInMutation.isPending || payOutMutation.isPending ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}
