// src/pages/pos/Kitchen.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { AccessTime as TimeIcon, CheckCircle, Kitchen as KitchenIcon } from '@mui/icons-material';
import { usePOS } from './hooks/usePOS';
import { useOrders } from './hooks/useOrders';
import { useDevice } from '../../contexts/DeviceContext';
import OrderCard from './components/OrderCard';
import { useKitchenWS, fetchOrderDetails } from '../../hooks/useKitchenWS';

const Kitchen: React.FC = () => {
  const { device, isRegistered, isLoading: posLoading, registerDevice } = usePOS();
  const { activeOrders, isLoading: ordersLoading, updateOrderStatus, refreshOrders } = useOrders();
  const { device: deviceInfo } = useDevice();

  const [showRegistration, setShowRegistration] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [realtimeOrders, setRealtimeOrders] = useState<any[]>([]);

  // Do not auto-open registration modal; users can open it from the sidebar.

  // Auto-refresh orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRegistered) {
        refreshOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isRegistered, refreshOrders]);

  const onNewOrder = async (orderId: number) => {
    try {
      const order = await fetchOrderDetails(orderId);
      if (order) {
        setRealtimeOrders(prev => [order, ...prev]);
      }
    } catch (err) {
      console.warn('Failed to fetch new order details', err);
    }
  };

  useKitchenWS(onNewOrder);

  const handleDeviceRegistration = async () => {
    if (!deviceName.trim()) {
      setError('Device name is required');
      return;
    }

    try {
      setError(null);
      await registerDevice({
        device_type: 'kitchen_display',
        device_name: deviceName,
        fingerprint: {
          userAgent: navigator.userAgent,
          screenResolution: `${(window as any).screen?.width || 0}x${(window as any).screen?.height || 0}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          plugins: Array.from(navigator.plugins).map(p => p.name),
          canvasFingerprint: '',
          webglFingerprint: '',
        },
      });
      setShowRegistration(false);
    } catch (err: any) {
      setError(err.message || 'Failed to register device');
    }
  };

  // Filter orders for kitchen display
  const combinedOrders = [...realtimeOrders, ...activeOrders];
  const pendingOrders = combinedOrders.filter(order =>
    ['confirmed', 'preparing'].includes(order.status)
  );

  const readyOrders = activeOrders.filter(order => order.status === 'ready');
  const combinedReady = combinedOrders.filter(order => order.status === 'ready');

  if (posLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!isRegistered) {
    return (
      <Dialog open={showRegistration} maxWidth="sm" fullWidth>
        <DialogTitle>Register Kitchen Display</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This kitchen display needs to be registered before use.
          </Typography>
          <TextField
            fullWidth
            label="Display Name"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder="e.g., Main Kitchen Display"
            sx={{ mb: 2 }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRegistration(false)} variant="outlined" sx={{ mr: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleDeviceRegistration} variant="contained">
            Register Display
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Box display="flex" alignItems="center" mb={3}>
        <KitchenIcon sx={{ mr: 2, fontSize: 40 }} />
        <Box>
          <Typography variant="h4">
            Kitchen Display - {device?.device_name} ({deviceInfo.type})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time order management system
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Pending Orders */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, backgroundColor: 'white' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <TimeIcon sx={{ mr: 1 }} />
              <Typography variant="h5">Orders in Progress ({pendingOrders.length})</Typography>
            </Box>

            {ordersLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : pendingOrders.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No orders currently in progress
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {pendingOrders.map(order => (
                  <Grid item xs={12} sm={6} md={4} key={order.order_id}>
                    <OrderCard order={order} onStatusUpdate={updateOrderStatus} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Ready Orders */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, backgroundColor: '#e8f5e8', border: '2px solid #4caf50' }}>
            <Box display="flex" alignItems="center" mb={2}>
              <CheckCircle sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="h5" color="success.main">
                Ready for Pickup ({readyOrders.length})
              </Typography>
            </Box>

            {combinedReady.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="text.secondary">
                  No orders ready for pickup
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {combinedReady.map(order => (
                  <Card key={order.order_id} sx={{ backgroundColor: 'white' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="h6">Order #{order.order_id}</Typography>
                        <Chip label="READY" color="success" size="small" />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {order.items.length} items • ${order.total.toFixed(2)}
                      </Typography>

                      <Typography variant="body2">
                        Ready at: {new Date(order.updated_at).toLocaleTimeString()}
                      </Typography>
                    </CardContent>

                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        onClick={() => updateOrderStatus(order.order_id, 'completed')}
                      >
                        Mark as Completed
                      </Button>
                    </CardActions>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Order Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Today's Statistics
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {activeOrders.filter(o => o.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Orders Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {pendingOrders.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {readyOrders.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready for Pickup
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {Math.round(activeOrders.reduce((sum, order) => sum + order.total, 0) * 100) /
                      100}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Kitchen;
