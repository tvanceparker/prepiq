// src/pages/pos/components/OrderCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  Divider,
} from '@mui/material';
import { AccessTime as TimeIcon, CheckCircle as CompleteIcon } from '@mui/icons-material';
import { Order } from '../../../interfaces/orders';

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: number, status: string) => Promise<any>;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdate }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'preparing':
        return 'primary';
      case 'ready':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'completed';
      default:
        return null;
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await onStatusUpdate(order.order_id, newStatus);
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">Order #{order.order_id}</Typography>
          <Chip
            label={order.status ? order.status.toUpperCase() : 'UNKNOWN'}
            color={getStatusColor(order.status || 'unknown') as any}
            size="small"
          />
        </Box>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          {order.sales_channel} • {Array.isArray(order.items) ? order.items.length : 0} items
        </Typography>

        <Box display="flex" alignItems="center" mb={1}>
          <TimeIcon sx={{ mr: 0.5, fontSize: 16 }} />
          <Typography variant="body2">
            {order?.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Typography variant="body2" fontWeight="bold">
          Total: ${order.total.toFixed(2)}
        </Typography>

        <Box mt={1}>
          {Array.isArray(order.items) && order.items.length > 0 ? (
            <>
              {order.items.slice(0, 3).map((item, index) => (
                <Typography key={index} variant="body2" color="text.secondary">
                  • {item.quantity}x Item #{item.menu_item_id}
                </Typography>
              ))}
              {order.items.length > 3 && (
                <Typography variant="body2" color="text.secondary">
                  ...and {order.items.length - 3} more items
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No items
            </Typography>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        {nextStatus && (
          <Button
            size="small"
            variant="contained"
            onClick={() => handleStatusUpdate(nextStatus)}
            sx={{ mr: 1 }}
          >
            Mark as {nextStatus}
          </Button>
        )}

        {order.status === 'ready' && (
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<CompleteIcon />}
            onClick={() => handleStatusUpdate('completed')}
          >
            Complete
          </Button>
        )}

        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <Button size="small" color="error" onClick={() => handleStatusUpdate('cancelled')}>
            Cancel
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default OrderCard;
