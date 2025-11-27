// src/pages/pos/components/KitchenBasic.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Card,
  Button,
  TextInput,
  Portal,
  Dialog,
  ActivityIndicator,
  Chip,
  useTheme,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useOrders } from '../../../hooks/useOrders';
import useWebSocket from '../../../hooks/useWebSocket';
import OrderCard from './OrderCard';
import { Order } from '../../../interfaces/orders';

const KitchenBasic: React.FC = () => {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Queries
  const { activeOrders, activeOrdersLoading: isLoading, updateOrderStatus, refreshOrders, isRefetching } = useOrders({ autoRefresh: true, refetchInterval: 5000 });

  // Handle status updates
  const handleStatusUpdate = async (orderId: number, status: string) => {
    await updateOrderStatus({ orderId, status });
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshOrders();
    setRefreshing(false);
  }, [refreshOrders]);

  // Separate by status
  const pendingOrders = activeOrders.filter((o: Order) =>
    ['pending', 'confirmed', 'preparing'].includes(o.status)
  );
  const readyOrders = activeOrders.filter((o: Order) => o.status === 'ready');
  const completedCount = activeOrders.filter((o: Order) => o.status === 'completed').length;

  // Stats
  const totalRevenue = activeOrders.reduce((sum: number, o: Order) => sum + (o.total || 0), 0);

  if (isLoading && activeOrders.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading kitchen display...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="stove"
            size={32}
            color={theme.colors.primary}
          />
          <View style={{ marginLeft: 12 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '600' }}>
              Kitchen Display
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Real-time order management
            </Text>
          </View>
        </View>
        <Chip
          icon={() => (
            <MaterialCommunityIcons
              name={isRefetching ? 'sync' : 'check-circle'}
              size={14}
              color={'#4caf50'}
            />
          )}
          style={styles.statusChip}
        >
          {isRefetching ? 'Updating' : 'Live'}
        </Chip>
      </View>

      {/* Orders In Progress */}
      <Surface style={styles.section} elevation={1}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.sectionTitle}>
            In Progress ({pendingOrders.length})
          </Text>
        </View>

        {pendingOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="chef-hat"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              No orders in progress
            </Text>
          </View>
        ) : (
          <View style={styles.ordersGrid}>
            {pendingOrders.map(order => (
              <View key={order.order_id} style={styles.orderCardWrapper}>
                <OrderCard order={order} onStatusUpdate={handleStatusUpdate} />
              </View>
            ))}
          </View>
        )}
      </Surface>

      {/* Ready for Pickup */}
      <Surface
        style={[styles.section, styles.readySection]}
        elevation={1}
      >
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: '#4caf50' }]}>
            Ready for Pickup ({readyOrders.length})
          </Text>
        </View>

        {readyOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No orders ready for pickup
            </Text>
          </View>
        ) : (
          readyOrders.map(order => (
            <Card key={order.order_id} style={styles.readyCard}>
              <Card.Content>
                <View style={styles.readyCardHeader}>
                  <Text variant="titleMedium">Order #{order.order_id}</Text>
                  <Chip compact style={{ backgroundColor: '#4caf50' }} textStyle={{ color: '#fff' }}>
                    READY
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {order.items?.length || 0} items • ${order.total.toFixed(2)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Ready at: {order.updated_at ? new Date(order.updated_at).toLocaleTimeString() : '--:--'}
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  buttonColor="#4caf50"
                  onPress={() => handleStatusUpdate(order.order_id, 'completed')}
                >
                  Mark Completed
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </Surface>

      {/* Today's Statistics */}
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
          Today's Statistics
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {completedCount}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Completed
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={{ color: '#ff9800', fontWeight: '700' }}>
              {pendingOrders.length}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              In Progress
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={{ color: '#4caf50', fontWeight: '700' }}>
              {readyOrders.length}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Ready
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium" style={{ color: '#2196f3', fontWeight: '700' }}>
              ${totalRevenue.toFixed(0)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Revenue
            </Text>
          </View>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    height: 28,
  },
  section: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  ordersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  orderCardWrapper: {
    width: '100%',
    paddingHorizontal: 6,
  },
  readySection: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  readyCard: {
    marginBottom: 12,
  },
  readyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
});

export default KitchenBasic;
