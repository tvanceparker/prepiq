// src/pages/inventory/components/PurchaseOrderCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { PurchaseOrder, PurchaseOrderStatus } from '../../../interfaces/inventory';

interface PurchaseOrderCardProps {
  order: PurchaseOrder;
  onPress?: (order: PurchaseOrder) => void;
  getStatusColor: (status: PurchaseOrderStatus) => string;
}

export function PurchaseOrderCard({
  order,
  onPress,
  getStatusColor,
}: PurchaseOrderCardProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined" onPress={() => onPress?.(order)}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="titleMedium" style={styles.poNumber}>
              {`PO #${order.order_id}`}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {order.supplier_name || 'Unknown Supplier'}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: getStatusColor(order.status) }]}
            textStyle={styles.statusText}
          >
            {order.status?.toUpperCase()}
          </Chip>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons
              name="package-variant"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.detailText}>
              {order.items?.length || 0} items
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons
              name="currency-usd"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.detailText}>
              ${order.total_order_price?.toFixed(2) || '0.00'}
            </Text>
          </View>
          {order.expected_delivery_date && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {new Date(order.expected_delivery_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poNumber: {
    fontWeight: '600',
  },
  statusChip: {
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
  },
});

export default PurchaseOrderCard;
