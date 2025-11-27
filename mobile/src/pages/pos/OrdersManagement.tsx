// src/pages/pos/OrdersManagement.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Chip,
  Searchbar,
  ActivityIndicator,
  useTheme,
  SegmentedButtons,
  FAB,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useOrders } from '../../hooks/useOrders';
import { AuthContext } from '../../contexts/AuthContext';
import OrderCard from './components/OrderCard';
import { Order, OrderStatus } from '../../interfaces/orders';

type FilterStatus = 'all' | OrderStatus;

interface OrderSection {
  title: string;
  data: Order[];
  status: string;
}

export default function OrdersManagement(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  // Queries
  const {
    allOrders: orders,
    allOrdersLoading: isLoading,
    updateOrderStatus,
    refreshOrders,
  } = useOrders({ status: statusFilter !== 'all' ? statusFilter : undefined });

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshOrders();
    setRefreshing(false);
  }, [refreshOrders]);

  // Filter orders
  const filteredOrders = React.useMemo(() => {
    let result = orders;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        order =>
          order.order_id.toString().includes(query) ||
          order.external_id?.toLowerCase().includes(query) ||
          order.sales_channel?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [orders, statusFilter, searchQuery]);

  // Group by status for SectionList
  const sections: OrderSection[] = React.useMemo(() => {
    const grouped: Record<string, Order[]> = {};

    filteredOrders.forEach(order => {
      const status = order.status || 'unknown';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(order);
    });

    // Define order of sections
    const statusOrder: string[] = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'completed',
      'cancelled',
    ];

    return statusOrder
      .filter(status => grouped[status]?.length > 0)
      .map(status => ({
        title: status.charAt(0).toUpperCase() + status.slice(1),
        data: grouped[status],
        status,
      }));
  }, [filteredOrders]);

  // Status update handler
  const handleStatusUpdate = async (orderId: number, status: string) => {
    await updateOrderStatus({ orderId, status });
  };

  // Status color helper
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'confirmed':
        return '#2196f3';
      case 'preparing':
        return theme.colors.primary;
      case 'ready':
        return '#4caf50';
      case 'completed':
        return '#9e9e9e';
      case 'cancelled':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    orders.forEach(order => {
      const status = order.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const renderSectionHeader = ({ section }: { section: OrderSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <View
        style={[styles.sectionIndicator, { backgroundColor: getStatusColor(section.status) }]}
      />
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip}>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderWrapper}>
      <OrderCard order={item} onStatusUpdate={handleStatusUpdate} />
    </View>
  );

  if (isLoading && orders.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="clipboard-list" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Orders
            </Text>
          </View>
          <Chip icon="receipt">{orders.length} total</Chip>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Status Filter Pills */}
        <View style={styles.filterRow}>
          {(['all', 'pending', 'preparing', 'ready', 'completed'] as FilterStatus[]).map(status => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
              style={styles.filterChip}
              showSelectedCheck={false}
              mode={statusFilter === status ? 'flat' : 'outlined'}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} (
              {statusCounts[status] || 0})
            </Chip>
          ))}
        </View>
      </Surface>

      {/* Orders List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="clipboard-text-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No orders found
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Orders will appear here'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.order_id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
        />
      )}

      {/* FAB for new order (links to POS) */}
      {tier !== 'basic' && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            // Navigation to POS would go here
          }}
          label="New Order"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontWeight: '600',
  },
  countChip: {
    height: 24,
  },
  orderWrapper: {
    marginBottom: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
