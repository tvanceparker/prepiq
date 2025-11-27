// src/pages/inventory/InventoryList.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Chip,
  ActivityIndicator,
  Card,
  Button,
  Portal,
  Modal,
  List,
  Divider,
  IconButton,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useInventory, useLotInfo } from '../../hooks/useInventory';
import { AuthContext } from '../../contexts/AuthContext';
import { InventoryItemDTO, InventoryLotDTO } from '../../interfaces/inventory';

interface InventorySection {
  title: string;
  data: InventoryItemDTO[];
}

export default function InventoryList(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItemDTO | null>(null);
  const [showLotModal, setShowLotModal] = useState(false);

  // Queries
  const { inventory, loading: isLoading, refresh } = useInventory();

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    inventory.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [inventory]);

  // Filter inventory
  const filteredInventory = React.useMemo(() => {
    let items = inventory;

    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query)
      );
    }

    return items;
  }, [inventory, categoryFilter, searchQuery]);

  // Group by category for SectionList
  const sections: InventorySection[] = React.useMemo(() => {
    const grouped: Record<string, InventoryItemDTO[]> = {};

    filteredInventory.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredInventory]);

  // Open lot detail modal
  const handleViewLots = (item: InventoryItemDTO) => {
    setSelectedItem(item);
    setShowLotModal(true);
  };

  // Stock level indicator
  const getStockLevel = (quantity: number, reorderPoint: number = 10) => {
    if (quantity <= 0) return { color: '#f44336', label: 'Out of Stock' };
    if (quantity <= reorderPoint) return { color: '#ff9800', label: 'Low Stock' };
    return { color: '#4caf50', label: 'In Stock' };
  };

  const renderSectionHeader = ({ section }: { section: InventorySection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="folder" size={18} color={theme.colors.primary} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip}>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: InventoryItemDTO }) => {
    const stockLevel = getStockLevel(item.total_quantity);
    const lotsCount = item.lots?.length || 0;

    return (
      <Card style={styles.itemCard} mode="outlined">
        <Pressable onPress={() => handleViewLots(item)}>
          <Card.Content>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <View style={styles.nameRow}>
                  <Text
                    variant="titleSmall"
                    style={styles.itemName}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.category || 'Uncategorized'}
                </Text>
              </View>

              <View style={styles.quantitySection}>
                <Text variant="titleLarge" style={[styles.quantity, { color: stockLevel.color }]}>
                  {item.total_quantity}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.unit}
                </Text>
              </View>
            </View>

            <View style={styles.itemFooter}>
              <Chip
                compact
                style={[styles.stockChip, { backgroundColor: stockLevel.color }]}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                {stockLevel.label}
              </Chip>

              {lotsCount > 0 && (
                <Button
                  mode="text"
                  compact
                  icon="package-variant"
                  onPress={() => handleViewLots(item)}
                >
                  {lotsCount} lot{lotsCount > 1 ? 's' : ''}
                </Button>
              )}
            </View>
          </Card.Content>
        </Pressable>
      </Card>
    );
  };

  if (isLoading && inventory.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="warehouse" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Inventory
            </Text>
          </View>
          <Chip icon="package-variant">{inventory.length} items</Chip>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Category Filters */}
        <View style={styles.filterScroll}>
          {categories.slice(0, 5).map(category => (
            <Chip
              key={category}
              selected={categoryFilter === category}
              onPress={() => setCategoryFilter(category)}
              style={styles.filterChip}
              showSelectedCheck={false}
              mode={categoryFilter === category ? 'flat' : 'outlined'}
            >
              {category === 'all' ? 'All' : category}
            </Chip>
          ))}
        </View>
      </Surface>

      {/* Inventory List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No inventory items found
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.inventory_id?.toString() || item.name}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled
        />
      )}

      {/* Lot Detail Modal */}
      <Portal>
        <Modal
          visible={showLotModal}
          onDismiss={() => setShowLotModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedItem && (
            <>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                  {selectedItem.name}
                </Text>
                <IconButton icon="close" onPress={() => setShowLotModal(false)} />
              </View>

              <Divider />

              <View style={styles.modalStats}>
                <View style={styles.statItem}>
                  <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
                    {selectedItem.total_quantity}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    On Hand ({selectedItem.unit})
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
                    {selectedItem.lots?.length || 0}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Active Lots
                  </Text>
                </View>
              </View>

              <Divider />

              <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
                Lot Breakdown
              </Text>

              {(!selectedItem.lots || selectedItem.lots.length === 0) ? (
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 24 }}>
                  No active lots
                </Text>
              ) : (
                selectedItem.lots.map((lot: InventoryLotDTO, index: number) => (
                  <List.Item
                    key={lot.lot_id || index}
                    title={`Lot #${lot.lot_id || index + 1}`}
                    description={`Qty: ${lot.quantity} | Expires: ${lot.expiration_date ? new Date(lot.expiration_date).toLocaleDateString() : 'N/A'}`}
                    left={props => <List.Icon {...props} icon="package-variant" />}
                  />
                ))
              )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    marginBottom: 12,
  },
  filterScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
  },
  countChip: {
    height: 22,
  },
  itemCard: {
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontWeight: '600',
  },
  quantitySection: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontWeight: '700',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  stockChip: {
    height: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  lotChips: {
    flexDirection: 'row',
    gap: 4,
  },
  lotChip: {
    height: 24,
  },
});
