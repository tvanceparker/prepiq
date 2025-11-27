// src/pages/inventory/PurchaseOrders.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Modal,
  List,
  Divider,
  IconButton,
  FAB,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { AuthContext } from '../../contexts/AuthContext';
import { PurchaseOrder, PurchaseOrderStatus } from '../../interfaces/inventory';

interface POSection {
  title: string;
  status: PurchaseOrderStatus;
  data: PurchaseOrder[];
}

export default function PurchaseOrders(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Queries
  const {
    orders: purchaseOrders,
    loading: isLoading,
    refresh,
    updateStatus,
    updatingStatus,
  } = usePurchaseOrders({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Filter POs
  const filteredPOs = React.useMemo(() => {
    if (!searchQuery) return purchaseOrders;
    const query = searchQuery.toLowerCase();
    return purchaseOrders.filter(
      po =>
        po.order_id?.toString().includes(query) || po.supplier_name?.toLowerCase().includes(query)
    );
  }, [purchaseOrders, searchQuery]);

  // Group by status
  const sections: POSection[] = React.useMemo(() => {
    const statusOrder: PurchaseOrderStatus[] = ['cart', 'pending', 'delivered', 'cancelled'];
    const grouped: Record<string, PurchaseOrder[]> = {};

    filteredPOs.forEach(po => {
      const status = po.status || 'pending';
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(po);
    });

    return statusOrder
      .filter(status => grouped[status]?.length > 0)
      .map(status => ({
        title: status.charAt(0).toUpperCase() + status.slice(1),
        status,
        data: grouped[status],
      }));
  }, [filteredPOs]);

  // Status color helper
  const getStatusColor = (status: PurchaseOrderStatus): string => {
    switch (status) {
      case 'cart':
        return '#9e9e9e';
      case 'pending':
        return '#ff9800';
      case 'delivered':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  // Handle status update
  const handleStatusUpdate = async (poId: number, newStatus: PurchaseOrderStatus) => {
    await updateStatus({ orderId: poId, status: newStatus });
    setSelectedPO(null);
  };

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: purchaseOrders.length };
    purchaseOrders.forEach(po => {
      const status = po.status || 'pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [purchaseOrders]);

  const renderSectionHeader = ({ section }: { section: POSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(section.status) }]} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip}>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: PurchaseOrder }) => (
    <Card style={styles.card} mode="outlined" onPress={() => setSelectedPO(item)}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="titleMedium" style={styles.poNumber}>
              {`PO #${item.order_id}`}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.supplier_name || 'Unknown Supplier'}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {item.status?.toUpperCase()}
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
              {item.items?.length || 0} items
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons
              name="currency-usd"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.detailText}>
              ${item.total_order_price?.toFixed(2) || '0.00'}
            </Text>
          </View>
          {item.expected_delivery_date && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {new Date(item.expected_delivery_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading && purchaseOrders.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading purchase orders...</Text>
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
              Purchase Orders
            </Text>
          </View>
          <View style={styles.headerChip}>
            <MaterialCommunityIcons name="file-document" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 4, color: theme.colors.primary }}>
              {purchaseOrders.length}
            </Text>
          </View>
        </View>

        <Searchbar
          placeholder="Search POs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Status Filter */}
        <View style={styles.filterRow}>
          {(['all', 'cart', 'pending', 'delivered', 'cancelled'] as const).map(status => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status as PurchaseOrderStatus | 'all')}
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

      {/* PO List */}
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
            No purchase orders found
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

      {/* FAB for new PO */}
      <FAB
        icon={() => <MaterialCommunityIcons name="plus" size={24} color="#fff" />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          // Navigation to create PO would go here
        }}
        label="New PO"
      />

      {/* PO Detail Modal */}
      <Portal>
        <Modal
          visible={!!selectedPO}
          onDismiss={() => setSelectedPO(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedPO && (
            <>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                  {`PO #${selectedPO.order_id}`}
                </Text>
                <IconButton
                  icon={() => (
                    <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
                  )}
                  onPress={() => setSelectedPO(null)}
                />
              </View>

              <Chip
                style={[styles.modalStatus, { backgroundColor: getStatusColor(selectedPO.status) }]}
                textStyle={{ color: '#fff' }}
              >
                {selectedPO.status?.toUpperCase()}
              </Chip>

              <Divider style={{ marginVertical: 12 }} />

              <List.Item
                title="Supplier"
                description={selectedPO.supplier_name || 'Unknown'}
                left={() => (
                  <MaterialCommunityIcons
                    name="truck"
                    size={24}
                    color={theme.colors.primary}
                    style={{ marginLeft: 8, alignSelf: 'center' }}
                  />
                )}
              />
              <List.Item
                title="Total Amount"
                description={`$${selectedPO.total_order_price?.toFixed(2) || '0.00'}`}
                left={() => (
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={24}
                    color={theme.colors.primary}
                    style={{ marginLeft: 8, alignSelf: 'center' }}
                  />
                )}
              />
              {selectedPO.expected_delivery_date && (
                <List.Item
                  title="Expected Delivery"
                  description={new Date(selectedPO.expected_delivery_date).toLocaleDateString()}
                  left={() => (
                    <MaterialCommunityIcons
                      name="calendar"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                />
              )}

              <Divider style={{ marginVertical: 12 }} />

              <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8 }}>
                Items ({selectedPO.items?.length || 0})
              </Text>

              {selectedPO.items?.map((item, index) => (
                <List.Item
                  key={index}
                  title={item.ingredient_name || `Item ${index + 1}`}
                  description={`Qty: ${item.quantity_ordered} | Unit: $${item.unit_price?.toFixed(
                    2
                  )}`}
                  right={() => (
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                      ${((item.quantity_ordered || 0) * (item.unit_price || 0)).toFixed(2)}
                    </Text>
                  )}
                />
              ))}

              <Divider style={{ marginVertical: 12 }} />

              {/* Quick Actions */}
              <View style={styles.modalActions}>
                {selectedPO.status === 'pending' && (
                  <Button
                    mode="contained"
                    onPress={() => handleStatusUpdate(selectedPO.order_id, 'delivered')}
                    loading={updatingStatus}
                  >
                    Mark as Delivered
                  </Button>
                )}
                {selectedPO.status === 'cart' && (
                  <Button
                    mode="contained"
                    buttonColor="#2196f3"
                    onPress={() => handleStatusUpdate(selectedPO.order_id, 'pending')}
                    loading={updatingStatus}
                  >
                    Submit Order
                  </Button>
                )}
                {['cart', 'pending'].includes(selectedPO.status) && (
                  <Button
                    mode="outlined"
                    textColor="#f44336"
                    onPress={() => handleStatusUpdate(selectedPO.order_id, 'cancelled')}
                    loading={updatingStatus}
                    style={{ marginTop: 8 }}
                  >
                    Cancel PO
                  </Button>
                )}
              </View>
            </>
          )}
        </Modal>
      </Portal>
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
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
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
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statusIndicator: {
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
    height: 22,
  },
  card: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  poNumber: {
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
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalStatus: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  modalActions: {
    marginTop: 8,
  },
});
