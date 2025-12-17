// src/pages/pos/components/PaymentTerminal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Slider,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  CreditCard as CardIcon,
  Money as CashIcon,
  Contactless as TapIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { createPaymentIntent, confirmPayment, cashDrawer, terminal } from '../../../api/pos';
import { TerminalReader, CashDrawerSession } from '../../../interfaces/pos';

interface PaymentTerminalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  onPaymentComplete: () => void;
  orderId?: number;
  cashDrawerSession?: CashDrawerSession | null;
}

const PaymentTerminal: React.FC<PaymentTerminalProps> = ({
  open,
  onClose,
  amount,
  onPaymentComplete,
  orderId,
  cashDrawerSession,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'terminal'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [terminalReaders, setTerminalReaders] = useState<TerminalReader[]>([]);
  const [selectedReader, setSelectedReader] = useState<number | null>(null);
  const [terminalStatus, setTerminalStatus] = useState<string>('');

  const tipPercentages = [0, 15, 18, 20, 25];
  const totalWithTip = amount + tipAmount;

  // Fetch terminal readers on mount
  useEffect(() => {
    if (open) {
      fetchTerminalReaders();
    }
  }, [open]);

  const fetchTerminalReaders = async () => {
    try {
      const readers = await terminal.getReaders();
      setTerminalReaders(readers.filter((r: TerminalReader) => r.status === 'online'));
      if (readers.length > 0 && readers[0].status === 'online') {
        setSelectedReader(readers[0].reader_id);
      }
    } catch (err) {
      console.error('Failed to fetch terminal readers:', err);
    }
  };

  const handleTipChange = (percent: number) => {
    setTipAmount(amount * (percent / 100));
  };

  const handleCardPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Create payment intent
      const paymentIntent = await createPaymentIntent({
        order_id: orderId?.toString() || 'temp-order-id',
        amount: totalWithTip,
        currency: 'usd',
        payment_method: 'card',
        tip_amount: tipAmount,
      });

      // In a real implementation, you would integrate with Stripe Elements here
      // For now, we'll simulate the payment process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm payment
      await confirmPayment(paymentIntent.payment_id);

      onPaymentComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTerminalPayment = async () => {
    if (!selectedReader) {
      setError('Please select a terminal reader');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setTerminalStatus('Creating payment...');

      // Create terminal payment
      const paymentResult = await terminal.createPayment({
        reader_id: selectedReader,
        amount: Math.round(totalWithTip * 100), // Convert to cents
        currency: 'usd',
        description: `Order #${orderId || 'POS'}`,
      });

      setTerminalStatus('Waiting for customer to present card...');

      // Process the payment on the terminal
      const processedPayment = await terminal.processPayment({
        reader_id: selectedReader,
        payment_intent_id: paymentResult.payment_intent_id,
      });

      if (processedPayment.status === 'completed') {
        setTerminalStatus('Payment successful!');
        await new Promise(resolve => setTimeout(resolve, 1000));
        onPaymentComplete();
        onClose();
      } else {
        setError(
          `Payment ${processedPayment.status}: ${processedPayment.failure_reason || 'Unknown error'}`
        );
      }
    } catch (err: any) {
      setError(err.message || 'Terminal payment failed');
    } finally {
      setIsProcessing(false);
      setTerminalStatus('');
    }
  };

  const handleCashPayment = async () => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < totalWithTip) {
      setError('Invalid amount received');
      return;
    }

    // Check if cash drawer is open
    if (!cashDrawerSession) {
      setError('Cash drawer must be opened before accepting cash payments');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Create payment intent for cash
      const paymentIntent = await createPaymentIntent({
        order_id: orderId?.toString() || 'temp-order-id',
        amount: totalWithTip,
        currency: 'usd',
        payment_method: 'cash',
        tip_amount: tipAmount,
      });

      // Record the cash transaction in the drawer
      await cashDrawer.recordSale({
        session_id: cashDrawerSession.session_id,
        amount: totalWithTip,
        payment_method: 'cash',
        tip_amount: tipAmount,
        cash_tendered: received,
        order_id: orderId,
        notes: `Payment for order #${orderId || 'POS'}`,
      });

      // Confirm cash payment
      await confirmPayment(paymentIntent.payment_id);

      onPaymentComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateChange = () => {
    const received = parseFloat(cashReceived);
    return isNaN(received) ? 0 : received - totalWithTip;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Payment Terminal</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Subtotal: ${amount.toFixed(2)}
          </Typography>
          {tipAmount > 0 && (
            <Typography variant="body1" align="center" color="text.secondary">
              Tip: ${tipAmount.toFixed(2)}
            </Typography>
          )}
          <Typography variant="h4" align="center" color="primary" sx={{ fontWeight: 'bold' }}>
            Total: ${totalWithTip.toFixed(2)}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {terminalStatus && (
          <Alert severity="info" sx={{ mb: 2 }} icon={<CircularProgress size={20} />}>
            {terminalStatus}
          </Alert>
        )}

        {/* Tip Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add Tip
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {tipPercentages.map(percent => (
              <Chip
                key={percent}
                label={percent === 0 ? 'No Tip' : `${percent}%`}
                onClick={() => handleTipChange(percent)}
                color={
                  Math.round(tipAmount) === Math.round(amount * (percent / 100))
                    ? 'primary'
                    : 'default'
                }
                variant={
                  Math.round(tipAmount) === Math.round(amount * (percent / 100))
                    ? 'filled'
                    : 'outlined'
                }
              />
            ))}
            <TextField
              size="small"
              label="Custom"
              type="number"
              value={
                tipAmount > 0 &&
                !tipPercentages.some(p => Math.round(tipAmount) === Math.round(amount * (p / 100)))
                  ? tipAmount.toFixed(2)
                  : ''
              }
              onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
              sx={{ width: 100 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select Payment Method
          </Typography>

          <Box display="flex" gap={2}>
            <Card
              sx={{
                flex: 1,
                cursor: 'pointer',
                border: paymentMethod === 'card' ? 2 : 1,
                borderColor: paymentMethod === 'card' ? 'primary.main' : 'divider',
              }}
              onClick={() => setPaymentMethod('card')}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CardIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">Card (Online)</Typography>
              </CardContent>
            </Card>

            <Card
              sx={{
                flex: 1,
                cursor: terminalReaders.length > 0 ? 'pointer' : 'not-allowed',
                border: paymentMethod === 'terminal' ? 2 : 1,
                borderColor: paymentMethod === 'terminal' ? 'primary.main' : 'divider',
                opacity: terminalReaders.length > 0 ? 1 : 0.5,
              }}
              onClick={() => terminalReaders.length > 0 && setPaymentMethod('terminal')}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <TapIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">Card Reader</Typography>
                {terminalReaders.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No readers
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card
              sx={{
                flex: 1,
                cursor: 'pointer',
                border: paymentMethod === 'cash' ? 2 : 1,
                borderColor: paymentMethod === 'cash' ? 'primary.main' : 'divider',
              }}
              onClick={() => setPaymentMethod('cash')}
            >
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <CashIcon sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="body2">Cash</Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {paymentMethod === 'card' && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Card payment will be processed securely through our payment provider.
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              In a production environment, this would integrate with Stripe Elements or similar
              payment processor.
            </Alert>
          </Box>
        )}

        {paymentMethod === 'terminal' && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Select Card Reader
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {terminalReaders.map(reader => (
                <Chip
                  key={reader.reader_id}
                  label={reader.label || reader.device_type}
                  onClick={() => setSelectedReader(reader.reader_id)}
                  color={selectedReader === reader.reader_id ? 'primary' : 'default'}
                  variant={selectedReader === reader.reader_id ? 'filled' : 'outlined'}
                  icon={reader.status === 'online' ? undefined : <WarningIcon />}
                />
              ))}
            </Box>
            <Alert severity="info">
              Customer will tap, insert, or swipe their card on the selected terminal reader.
            </Alert>
          </Box>
        )}

        {paymentMethod === 'cash' && (
          <Box>
            {!cashDrawerSession && (
              <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
                Cash drawer is not open. Open the drawer to accept cash payments.
              </Alert>
            )}
            <TextField
              fullWidth
              label="Cash Received"
              type="number"
              value={cashReceived}
              onChange={e => setCashReceived(e.target.value)}
              placeholder="0.00"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
            />

            {cashReceived && (
              <Box>
                <Typography variant="body2">
                  Change Due: <strong>${calculateChange().toFixed(2)}</strong>
                </Typography>
                {calculateChange() < 0 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Insufficient amount received
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isProcessing}>
          Cancel
        </Button>

        {paymentMethod === 'card' && (
          <Button
            onClick={handleCardPayment}
            variant="contained"
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <CardIcon />}
          >
            {isProcessing ? 'Processing...' : `Pay $${totalWithTip.toFixed(2)}`}
          </Button>
        )}

        {paymentMethod === 'terminal' && (
          <Button
            onClick={handleTerminalPayment}
            variant="contained"
            disabled={isProcessing || !selectedReader}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <TapIcon />}
          >
            {isProcessing ? 'Processing...' : `Charge $${totalWithTip.toFixed(2)}`}
          </Button>
        )}

        {paymentMethod === 'cash' && (
          <Button
            onClick={handleCashPayment}
            variant="contained"
            disabled={isProcessing || calculateChange() < 0 || !cashDrawerSession}
            startIcon={isProcessing ? <CircularProgress size={20} /> : <CashIcon />}
          >
            {isProcessing ? 'Processing...' : 'Complete Cash Payment'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PaymentTerminal;
