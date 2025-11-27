// src/pages/pos/components/OrderCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, Chip, Divider, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Order } from '../../../interfaces/orders';

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: number, status: string) => Promise<void>;
  compact?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdate, compact = false }) => {
  const theme = useTheme();

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#ff9800'; // orange
      case 'confirmed':
        return '#2196f3'; // blue
      case 'preparing':
        return theme.colors.primary;
      case 'ready':
        return '#4caf50'; // green
      case 'completed':
        return '#9e9e9e'; // grey
      case 'cancelled':
        return '#f44336'; // red
      default:
        return '#9e9e9e';
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
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
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.orderId}>
            Order #{order.order_id}
          </Text>
          <Chip
            style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}
            textStyle={styles.statusText}
            compact
          >
            {order.status?.toUpperCase() || 'UNKNOWN'}
          </Chip>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {order.sales_channel} • {itemCount} items
          </Text>
        </View>

        {/* Time */}
        <View style={styles.timeRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={14}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="bodySmall" style={[styles.timeText, { color: theme.colors.onSurfaceVariant }]}>
            {order.created_at ? new Date(order.created_at).toLocaleTimeString() : '--:--'}
          </Text>
        </View>

        <Divider style={styles.divider} />

        {/* Total */}
        <Text variant="titleSmall" style={styles.total}>
          Total: ${order.total.toFixed(2)}
        </Text>

        {/* Items Preview */}
        {!compact && itemCount > 0 && (
          <View style={styles.itemsPreview}>
            {order.items.slice(0, 3).map((item, index) => (
              <Text
                key={index}
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                • {item.quantity}x {item.name || `Item #${item.menu_item_id}`}
              </Text>
            ))}
            {itemCount > 3 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                ...and {itemCount - 3} more
              </Text>
            )}
          </View>
        )}
      </Card.Content>

      <Card.Actions style={styles.actions}>
        {nextStatus && (
          <Button
            mode="contained"
            compact
            onPress={() => handleStatusUpdate(nextStatus)}
            style={styles.actionButton}
          >
            {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
          </Button>
        )}

        {order.status === 'ready' && (
          <Button
            mode="contained"
            compact
            buttonColor="#4caf50"
            icon="check"
            onPress={() => handleStatusUpdate('completed')}
            style={styles.actionButton}
          >
            Complete
          </Button>
        )}

        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <Button
            mode="text"
            compact
            textColor="#f44336"
            onPress={() => handleStatusUpdate('cancelled')}
          >
            Cancel
          </Button>
        )}
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeText: {
    marginLeft: 4,
  },
  divider: {
    marginVertical: 8,
  },
  total: {
    fontWeight: '600',
  },
  itemsPreview: {
    marginTop: 8,
  },
  actions: {
    paddingTop: 0,
    flexWrap: 'wrap',
  },
  actionButton: {
    marginRight: 8,
  },
});

export default OrderCard;
