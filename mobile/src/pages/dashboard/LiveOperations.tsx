// src/pages/dashboard/LiveOperations.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ProgressBar,
  useTheme,
  Avatar,
  Divider,
  Surface,
  IconButton,
  Badge,
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
// import { dashboardApi } from '../../api/dashboard'; // TODO: Add when API endpoint available

interface ShiftData {
  shift_name: string;
  start_time: string;
  end_time: string;
  staff_count: number;
  tables_active: number;
}

interface OrderSummary {
  pending: number;
  in_progress: number;
  completed: number;
  avg_prep_time: number;
}

interface KitchenStatus {
  station: string;
  status: 'ready' | 'busy' | 'overloaded';
  queue: number;
}

const StatusIndicator = ({ status }: { status: 'ready' | 'busy' | 'overloaded' | string }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    ready: { bg: '#e8f5e9', text: '#2e7d32' },
    busy: { bg: '#fff3e0', text: '#e65100' },
    overloaded: { bg: '#ffebee', text: '#c62828' },
  };
  const color = colors[status] || colors.busy;

  return (
    <Chip
      compact
      style={{ backgroundColor: color.bg }}
      textStyle={{ color: color.text, fontSize: 10, textTransform: 'capitalize' }}
    >
      {status}
    </Chip>
  );
};

export default function LiveOperations() {
  const theme = useTheme();

  // Mock data - replace with actual API call when available
  const { data, isLoading } = useQuery({
    queryKey: ['live-operations'],
    queryFn: async () => {
      // In real implementation: return dashboardApi.getLiveOperations();
      return {
        shift: {
          shift_name: 'Evening Shift',
          start_time: '4:00 PM',
          end_time: '10:00 PM',
          staff_count: 8,
          tables_active: 12,
        },
        orders: {
          pending: 5,
          in_progress: 8,
          completed: 45,
          avg_prep_time: 14,
        },
        kitchen: [
          { station: 'Grill', status: 'busy', queue: 4 },
          { station: 'Fryer', status: 'ready', queue: 1 },
          { station: 'Prep', status: 'ready', queue: 2 },
          { station: 'Plating', status: 'busy', queue: 3 },
        ] as KitchenStatus[],
        deliveries: {
          pending: 3,
          in_transit: 2,
          delivered: 18,
        },
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Loading live data...
        </Text>
      </View>
    );
  }

  const shift = data?.shift;
  const orders = data?.orders;
  const kitchen = data?.kitchen || [];
  const deliveries = data?.deliveries;

  const totalOrders =
    (orders?.pending || 0) + (orders?.in_progress || 0) + (orders?.completed || 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>
            Live Operations
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Real-time activity monitoring
          </Text>
        </View>
        <Chip icon="refresh" mode="outlined" compact>
          Live
        </Chip>
      </View>

      {/* Current Shift */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Current Shift"
          subtitle={shift?.shift_name}
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="clock-outline"
              style={{ backgroundColor: `${theme.colors.primary}20` }}
              color={theme.colors.primary}
            />
          )}
        />
        <Card.Content>
          <View style={styles.shiftInfo}>
            <Surface style={styles.shiftSurface} elevation={0}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                {shift?.staff_count}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Staff On Duty
              </Text>
            </Surface>
            <Surface style={styles.shiftSurface} elevation={0}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                {shift?.tables_active}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Active Tables
              </Text>
            </Surface>
            <Surface style={styles.shiftSurface} elevation={0}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                {shift?.start_time}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Shift Started
              </Text>
            </Surface>
          </View>
        </Card.Content>
      </Card>

      {/* Order Flow */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Order Flow"
          subtitle={`${totalOrders} total orders today`}
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="food"
              style={{ backgroundColor: `${theme.colors.secondary}20` }}
              color={theme.colors.secondary}
            />
          )}
        />
        <Card.Content>
          <View style={styles.orderStats}>
            <View style={styles.orderStat}>
              <View style={styles.orderStatHeader}>
                <Badge style={{ backgroundColor: '#ff9800' }}>{orders?.pending}</Badge>
                <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                  Pending
                </Text>
              </View>
              <ProgressBar
                progress={(orders?.pending || 0) / Math.max(totalOrders, 1)}
                color="#ff9800"
                style={styles.progressBar}
              />
            </View>
            <View style={styles.orderStat}>
              <View style={styles.orderStatHeader}>
                <Badge style={{ backgroundColor: '#2196f3' }}>{orders?.in_progress}</Badge>
                <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                  In Progress
                </Text>
              </View>
              <ProgressBar
                progress={(orders?.in_progress || 0) / Math.max(totalOrders, 1)}
                color="#2196f3"
                style={styles.progressBar}
              />
            </View>
            <View style={styles.orderStat}>
              <View style={styles.orderStatHeader}>
                <Badge style={{ backgroundColor: '#4caf50' }}>{orders?.completed}</Badge>
                <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                  Completed
                </Text>
              </View>
              <ProgressBar
                progress={(orders?.completed || 0) / Math.max(totalOrders, 1)}
                color="#4caf50"
                style={styles.progressBar}
              />
            </View>
          </View>

          <Divider style={{ marginVertical: 16 }} />

          <View style={styles.avgPrepTime}>
            <Avatar.Icon
              size={36}
              icon="timer"
              style={{ backgroundColor: `${theme.colors.tertiary}20` }}
              color={theme.colors.tertiary}
            />
            <View style={{ marginLeft: 12 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                Avg. Prep Time
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                {orders?.avg_prep_time} min
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Kitchen Status */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Kitchen Status"
          subtitle="Station activity"
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="stove"
              style={{ backgroundColor: '#ffebee' }}
              color="#d32f2f"
            />
          )}
        />
        <Card.Content>
          {kitchen.map((station, index) => (
            <View key={station.station}>
              <View style={styles.stationRow}>
                <View style={styles.stationInfo}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {station.station}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {station.queue} orders in queue
                  </Text>
                </View>
                <StatusIndicator status={station.status} />
              </View>
              {index < kitchen.length - 1 && <Divider style={{ marginVertical: 8 }} />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Deliveries */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Deliveries"
          subtitle="Today's delivery status"
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="truck-delivery"
              style={{ backgroundColor: '#e3f2fd' }}
              color="#1976d2"
            />
          )}
        />
        <Card.Content>
          <View style={styles.deliveryStats}>
            <Surface style={styles.deliverySurface} elevation={0}>
              <Badge style={{ backgroundColor: '#ff9800', alignSelf: 'center' }} size={24}>
                {deliveries?.pending}
              </Badge>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Pending
              </Text>
            </Surface>
            <Surface style={styles.deliverySurface} elevation={0}>
              <Badge style={{ backgroundColor: '#2196f3', alignSelf: 'center' }} size={24}>
                {deliveries?.in_transit}
              </Badge>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                In Transit
              </Text>
            </Surface>
            <Surface style={styles.deliverySurface} elevation={0}>
              <Badge style={{ backgroundColor: '#4caf50', alignSelf: 'center' }} size={24}>
                {deliveries?.delivered}
              </Badge>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Delivered
              </Text>
            </Surface>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  shiftInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  shiftSurface: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  orderStats: {
    gap: 12,
  },
  orderStat: {
    marginBottom: 4,
  },
  orderStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  avgPrepTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  stationInfo: {
    flex: 1,
  },
  deliveryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  deliverySurface: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
