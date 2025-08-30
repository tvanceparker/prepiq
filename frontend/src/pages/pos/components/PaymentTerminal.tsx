// src/pages/pos/components/PaymentTerminal.tsx
import React, { useState } from 'react';
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
} from '@mui/material';
import { CreditCard as CardIcon, Money as CashIcon } from '@mui/icons-material';
import { createPaymentIntent, confirmPayment } from '../../../api/pos';

interface PaymentTerminalProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  onPaymentComplete: () => void;
}

const PaymentTerminal: React.FC<PaymentTerminalProps> = ({
  open,
  onClose,
  amount,
  onPaymentComplete,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState<string>('');

  const handleCardPayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);

      // Create payment intent
      const paymentIntent = await createPaymentIntent({
        order_id: 'temp-order-id', // This would come from the actual order
        amount,
        currency: 'usd',
        payment_method: 'card',
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

  const handleCashPayment = async () => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < amount) {
      setError('Invalid amount received');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Create payment intent for cash
      const paymentIntent = await createPaymentIntent({
        order_id: 'temp-order-id', // This would come from the actual order
        amount,
        currency: 'usd',
        payment_method: 'cash',
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
    return isNaN(received) ? 0 : received - amount;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Payment Terminal</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" align="center" gutterBottom>
            Total Amount: ${amount.toFixed(2)}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

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
                <Typography variant="body2">Card</Typography>
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

        {paymentMethod === 'cash' && (
          <Box>
            <TextField
              fullWidth
              label="Cash Received"
              type="number"
              value={cashReceived}
              onChange={e => setCashReceived(e.target.value)}
              placeholder="0.00"
              sx={{ mb: 2 }}
            />

            {cashReceived && (
              <Box>
                <Typography variant="body2">Change: ${calculateChange().toFixed(2)}</Typography>
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
            {isProcessing ? 'Processing...' : 'Pay with Card'}
          </Button>
        )}

        {paymentMethod === 'cash' && (
          <Button
            onClick={handleCashPayment}
            variant="contained"
            disabled={isProcessing || calculateChange() < 0}
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
