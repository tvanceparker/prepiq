// src/pages/inventory/InventoryList.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable, ScrollView } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Chip,
  ActivityIndicator,
  Card,
  Button,
  TextInput,
  Portal,
  Modal,
  Divider,
  IconButton,
  useTheme,
  ProgressBar,
  Snackbar,
  HelperText,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useInventory, useLotInfo } from '../../hooks/useInventory';
import { AuthContext } from '../../contexts/AuthContext';
import { InventoryItem, LotBreakdown } from '../../interfaces/inventory';

interface InventorySection {
  title: string;
  data: InventoryItem[];
}

export default function InventoryList(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [selectedLotRemaining, setSelectedLotRemaining] = useState<number | null>(null);
  const [showLotModal, setShowLotModal] = useState(false);
  const [showLotDetailModal, setShowLotDetailModal] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: '', type: 'success' });
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustUsageType, setAdjustUsageType] = useState('manual_adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Queries
  const {
    inventory,
    loading: isLoading,
    refresh,
    adjustInventory: adjustInventoryMutation,
    adjusting,
  } = useInventory();
  const { lotInfo, usedLogs, wastedLogs, loading: lotLoading } = useLotInfo(selectedLotId);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
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
      items = items.filter(item => item.ingredient_name?.toLowerCase().includes(query));
    }

    return items;
  }, [inventory, categoryFilter, searchQuery]);

  // Group by category for SectionList
  const sections: InventorySection[] = React.useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {};

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

  // Open lot breakdown modal
  const handleViewLots = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowLotModal(true);
  };

  // Open lot detail modal (for a specific lot)
  const handleViewLotDetail = (lotId: number) => {
    setSelectedLotId(lotId);
    const lot = selectedItem?.packaging_breakdown?.find(l => l.lot_id === lotId);
    setSelectedLotRemaining(lot?.remaining_quantity ?? null);
    setShowLotDetailModal(true);
    setAdjustQuantity('');
    setAdjustUsageType('manual_adjustment');
    setAdjustNotes('');
    setAdjustError(null);
  };

  const handleAdjustLot = async (params: {
    quantity: number;
    usageType: string;
    notes?: string;
  }) => {
    if (!selectedItem || !selectedLotId) {
      throw new Error('Select a lot first');
    }

    await adjustInventoryMutation({
      inventory_id: selectedItem.inventory_id,
      lot_id: selectedLotId,
      adjustment_quantity: params.quantity,
      usage_type: params.usageType,
      notes: params.notes,
    });

    setSnackbar({ visible: true, message: 'Adjustment saved', type: 'success' });
    await refresh();
  };

  const submitLotAdjustment = async () => {
    const qty = Number(adjustQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setAdjustError('Enter a quantity greater than zero');
      return;
    }
    if (
      adjustUsageType !== 'manual_addition' &&
      selectedLotRemaining !== null &&
      selectedLotRemaining !== undefined
    ) {
      if (qty > selectedLotRemaining) {
        setAdjustError('Cannot subtract more than the lot has remaining');
        return;
      }
    }

    try {
      await handleAdjustLot({
        quantity: qty,
        usageType: adjustUsageType,
        notes: adjustNotes.trim() || undefined,
      });
      setAdjustError(null);
      setAdjustQuantity('');
      setAdjustNotes('');
    } catch (err: any) {
      setAdjustError(err?.message || 'Failed to adjust lot');
      setSnackbar({ visible: true, message: 'Adjustment failed', type: 'error' });
    }
  };

  // Stock level indicator
  const getStockLevel = (quantity: number, reorderPoint: number = 10) => {
    if (quantity <= 0) return { color: '#f44336', label: 'Out of Stock', icon: 'alert-circle' };
    if (quantity <= reorderPoint) return { color: '#ff9800', label: 'Low Stock', icon: 'alert' };
    return { color: '#4caf50', label: 'In Stock', icon: 'check-circle' };
  };

  // Format date helper
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const renderSectionHeader = ({ section }: { section: InventorySection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="folder" size={18} color={theme.colors.primary} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <View style={styles.sectionCount}>
        <Text variant="labelSmall">{section.data.length}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const stockLevel = getStockLevel(item.quantity_on_hand);
    const lotsCount = item.packaging_breakdown?.length || 0;
    const isBatchRecipe = item.batch_recipe_id !== null;

    return (
      <Card style={styles.itemCard} mode="outlined">
        <Pressable onPress={() => handleViewLots(item)}>
          <Card.Content>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <View style={styles.nameRow}>
                  <Text
                    variant="titleSmall"
                    style={[
                      styles.itemName,
                      isBatchRecipe && { color: theme.colors.primary, fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {item.ingredient_name}
                    {isBatchRecipe && ' (Batch)'}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.category || 'Uncategorized'}
                </Text>
              </View>

              <View style={styles.quantitySection}>
                <Text
                  variant="headlineMedium"
                  style={[styles.quantity, { color: stockLevel.color }]}
                >
                  {item.quantity_on_hand}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.unit}
                </Text>
              </View>
            </View>

            <View style={styles.itemFooter}>
              <View style={[styles.statusBadge, { backgroundColor: `${stockLevel.color}15` }]}>
                <MaterialCommunityIcons
                  name={stockLevel.icon as any}
                  size={14}
                  color={stockLevel.color}
                />
                <Text variant="labelSmall" style={{ color: stockLevel.color, marginLeft: 4 }}>
                  {stockLevel.label}
                </Text>
              </View>

              <Pressable style={styles.lotsButton} onPress={() => handleViewLots(item)}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text variant="labelMedium" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                  {lotsCount} lot{lotsCount !== 1 ? 's' : ''}
                </Text>
              </Pressable>
            </View>
          </Card.Content>
        </Pressable>
      </Card>
    );
  };

  // Render lot item in the breakdown modal
  const renderLotItem = (lot: LotBreakdown, index: number) => {
    const usagePercent =
      lot.quantity > 0 ? ((lot.quantity - lot.remaining_quantity) / lot.quantity) * 100 : 0;

    return (
      <Card key={lot.lot_id || index} style={styles.lotCard} mode="outlined">
        <Pressable onPress={() => handleViewLotDetail(lot.lot_id)}>
          <Card.Content>
            <View style={styles.lotHeader}>
              <View style={styles.lotTitleRow}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text variant="titleSmall" style={{ marginLeft: 6, fontWeight: '600' }}>
                  Lot #{lot.lot_id}
                </Text>
              </View>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(lot.delivery_date)}
              </Text>
            </View>

            {/* Usage Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabelRow}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {lot.remaining_quantity} / {lot.quantity} remaining
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {Math.round(100 - usagePercent)}%
                </Text>
              </View>
              <ProgressBar
                progress={lot.remaining_quantity / Math.max(lot.quantity, 1)}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>

            {/* Lot Stats */}
            <View style={styles.lotStatsRow}>
              <View style={styles.lotStat}>
                <MaterialCommunityIcons name="plus-circle" size={14} color="#4caf50" />
                <Text variant="labelSmall" style={{ marginLeft: 4, color: '#4caf50' }}>
                  +{lot.added_quantity || 0}
                </Text>
              </View>
              <View style={styles.lotStat}>
                <MaterialCommunityIcons name="minus-circle" size={14} color="#2196f3" />
                <Text variant="labelSmall" style={{ marginLeft: 4, color: '#2196f3' }}>
                  -{lot.used_quantity || 0}
                </Text>
              </View>
              <View style={styles.lotStat}>
                <MaterialCommunityIcons name="delete" size={14} color="#ff9800" />
                <Text variant="labelSmall" style={{ marginLeft: 4, color: '#ff9800' }}>
                  -{lot.wasted_quantity || 0}
                </Text>
              </View>
            </View>

            {/* Packaging Info */}
            {lot.pack_size && (
              <View style={styles.packagingRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  📦 {lot.packages_received_total || 0} packs received • ~
                  {lot.approx_packages_remaining || 0} remaining
                </Text>
              </View>
            )}
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
          <View style={styles.headerItemCount}>
            <MaterialCommunityIcons name="package-variant" size={16} color={theme.colors.primary} />
            <Text style={{ marginLeft: 4, color: theme.colors.primary }}>
              {inventory.length} items
            </Text>
          </View>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {categories.map(category => (
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
        </ScrollView>
      </Surface>

      {/* Inventory List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No inventory items found
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.inventory_id?.toString() || item.ingredient_name}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
        />
      )}

      {/* Lot Breakdown Modal */}
      <Portal>
        <Modal
          visible={showLotModal}
          onDismiss={() => setShowLotModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedItem && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <View>
                  <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                    {selectedItem.ingredient_name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {selectedItem.category || 'Uncategorized'}
                  </Text>
                </View>
                <IconButton
                  icon={() => (
                    <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
                  )}
                  onPress={() => setShowLotModal(false)}
                />
              </View>

              <Divider />

              {/* Summary Stats */}
              <View style={styles.modalStats}>
                <View style={styles.statItem}>
                  <Text
                    variant="headlineSmall"
                    style={{ fontWeight: '700', color: theme.colors.primary }}
                  >
                    {selectedItem.quantity_on_hand}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    On Hand ({selectedItem.unit})
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
                    {selectedItem.packaging_breakdown?.length || 0}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Active Lots
                  </Text>
                </View>
              </View>

              <Divider />

              <Text
                variant="titleMedium"
                style={{ marginTop: 16, marginBottom: 12, fontWeight: '600' }}
              >
                FIFO Lot Breakdown
              </Text>

              {!selectedItem.packaging_breakdown ||
              selectedItem.packaging_breakdown.length === 0 ? (
                <View style={styles.emptyLots}>
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={48}
                    color={theme.colors.outline}
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                    No active lots for this item
                  </Text>
                </View>
              ) : (
                selectedItem.packaging_breakdown.map((lot, index) => renderLotItem(lot, index))
              )}
            </ScrollView>
          )}
        </Modal>

        {/* Lot Detail Modal (shows usage/waste logs) */}
        <Modal
          visible={showLotDetailModal}
          onDismiss={() => setShowLotDetailModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <ScrollView>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                Lot #{selectedLotId} Details
              </Text>
              <IconButton
                icon={() => (
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
                )}
                onPress={() => setShowLotDetailModal(false)}
              />
            </View>

            <Divider />

            {lotLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" />
              </View>
            ) : (
              <>
                {lotInfo && (
                  <View style={styles.lotInfoSection}>
                    <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8 }}>
                      Lot Information
                    </Text>
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Delivery Date:
                      </Text>
                      <Text variant="bodyMedium">{formatDate(lotInfo.delivery_date)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Received Qty:
                      </Text>
                      <Text variant="bodyMedium">{lotInfo.received_quantity}</Text>
                    </View>
                    {lotInfo.spoilage_expected_date && (
                      <View style={styles.infoRow}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Expected Spoilage:
                        </Text>
                        <Text variant="bodyMedium">
                          {formatDate(lotInfo.spoilage_expected_date)}
                        </Text>
                      </View>
                    )}
                    {lotInfo.supplier?.supplier_name && (
                      <View style={styles.infoRow}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Supplier:
                        </Text>
                        <Text variant="bodyMedium">{lotInfo.supplier.supplier_name}</Text>
                      </View>
                    )}
                  </View>
                )}

                <Divider style={{ marginVertical: 12 }} />

                {/* Used Logs */}
                <Text
                  variant="titleSmall"
                  style={{ fontWeight: '600', marginBottom: 8, color: '#2196f3' }}
                >
                  Usage Logs ({usedLogs.length})
                </Text>
                {usedLogs.length === 0 ? (
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.outline, marginBottom: 12 }}
                  >
                    No usage logs
                  </Text>
                ) : (
                  usedLogs.slice(0, 5).map((log, idx) => (
                    <View key={log.usage_id || idx} style={styles.logItem}>
                      <View>
                        <Text variant="bodySmall">{log.usage_type}</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatDate(log.used_date)}
                        </Text>
                      </View>
                      <Text variant="bodyMedium" style={{ color: '#2196f3' }}>
                        -{log.used_quantity} {log.unit}
                      </Text>
                    </View>
                  ))
                )}

                <Divider style={{ marginVertical: 12 }} />

                {/* Waste Logs */}
                <Text
                  variant="titleSmall"
                  style={{ fontWeight: '600', marginBottom: 8, color: '#ff9800' }}
                >
                  Waste Logs ({wastedLogs.length})
                </Text>
                {wastedLogs.length === 0 ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                    No waste logs
                  </Text>
                ) : (
                  wastedLogs.slice(0, 5).map((log, idx) => (
                    <View key={log.usage_id || idx} style={styles.logItem}>
                      <View>
                        <Text variant="bodySmall">{log.usage_type}</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatDate(log.used_date)}
                        </Text>
                      </View>
                      <Text variant="bodyMedium" style={{ color: '#ff9800' }}>
                        -{log.used_quantity} {log.unit}
                      </Text>
                    </View>
                  ))
                )}

                <Divider style={{ marginVertical: 12 }} />

                <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8 }}>
                  Adjust this lot
                </Text>

                <TextInput
                  label={`Quantity (${selectedItem?.unit || ''})`}
                  value={adjustQuantity}
                  onChangeText={setAdjustQuantity}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  style={{ marginBottom: 8 }}
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginVertical: 6 }}
                >
                  {[
                    { key: 'manual_addition', label: 'Add' },
                    { key: 'manual_adjustment', label: 'Adjust (-)' },
                    { key: 'waste', label: 'Waste' },
                    { key: 'spoilage', label: 'Spoilage' },
                  ].map(option => (
                    <Button
                      key={option.key}
                      mode={adjustUsageType === option.key ? 'contained' : 'outlined'}
                      style={{ marginRight: 8 }}
                      onPress={() => setAdjustUsageType(option.key)}
                      compact
                    >
                      {option.label}
                    </Button>
                  ))}
                </ScrollView>

                <TextInput
                  label="Notes (optional)"
                  value={adjustNotes}
                  onChangeText={setAdjustNotes}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={{ marginBottom: 4 }}
                />

                <HelperText type="info">
                  Lot remaining: {selectedLotRemaining ?? 'N/A'} {selectedItem?.unit || ''}
                </HelperText>

                {adjustError && <HelperText type="error">{adjustError}</HelperText>}

                <Button
                  mode="contained"
                  onPress={submitLotAdjustment}
                  loading={adjusting}
                  disabled={adjusting}
                >
                  Save adjustment
                </Button>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={2500}
      >
        <Text style={{ color: '#fff' }}>{snackbar.message}</Text>
      </Snackbar>
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
    padding: 20,
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
  headerItemCount: {
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
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
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
  sectionCount: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  itemCard: {
    marginBottom: 10,
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
    marginTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  lotsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  emptyLots: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  lotCard: {
    marginBottom: 10,
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressSection: {
    marginVertical: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  lotStatsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginTop: 8,
  },
  lotStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packagingRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lotInfoSection: {
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});
