// src/pages/inventory/InventoryList.tsx
import React, { useState, useCallback, useContext, useEffect } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  RadioButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useInventory, useLotInfo } from '../../hooks/useInventory';
import { AuthContext } from '../../contexts/AuthContext';
import {
  InventoryDeductionDiscrepancy,
  InventoryItem,
  LotBreakdown,
} from '../../interfaces/inventory';

interface InventorySection {
  title: string;
  data: InventoryItem[];
}

export default function InventoryList(): React.JSX.Element {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ingredients' | 'batches' | 'review'>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);
  const [selectedLotRemaining, setSelectedLotRemaining] = useState<number | null>(null);
  const [selectedLotUnit, setSelectedLotUnit] = useState<string | undefined>(undefined);
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
  const [countedQuantity, setCountedQuantity] = useState('');
  const [reviewReason, setReviewReason] = useState('count_correction');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Queries
  const {
    inventory,
    discrepancies,
    loading: isLoading,
    refresh,
    adjustInventory: adjustInventoryMutation,
    adjusting,
    setCurrentStock,
    reconciling,
  } = useInventory();
  const { lotInfo, usedLogs, wastedLogs, loading: lotLoading } = useLotInfo(selectedLotId);

  const discrepancyMap = React.useMemo(() => {
    const map = new Map<string, InventoryDeductionDiscrepancy[]>();
    discrepancies.forEach(discrepancy => {
      const key =
        discrepancy.ingredient_id != null
          ? `ingredient:${discrepancy.ingredient_id}`
          : discrepancy.batch_recipe_id != null
            ? `batch:${discrepancy.batch_recipe_id}`
            : 'unknown';
      const existing = map.get(key) || [];
      existing.push(discrepancy);
      map.set(key, existing);
    });
    return map;
  }, [discrepancies]);

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

    if (typeFilter === 'ingredients') {
      items = items.filter(item => item.batch_recipe_id === null);
    } else if (typeFilter === 'batches') {
      items = items.filter(item => item.batch_recipe_id !== null);
    } else if (typeFilter === 'review') {
      items = items.filter(item => {
        if (item.ingredient_id != null) {
          return discrepancyMap.has(`ingredient:${item.ingredient_id}`);
        }
        if (item.batch_recipe_id != null) {
          return discrepancyMap.has(`batch:${item.batch_recipe_id}`);
        }
        return false;
      });
    }

    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => item.ingredient_name?.toLowerCase().includes(query));
    }

    return items;
  }, [inventory, categoryFilter, discrepancyMap, searchQuery, typeFilter]);

  const selectedItemDiscrepancies = React.useMemo(() => {
    if (!selectedItem) {
      return [];
    }

    const key =
      selectedItem.ingredient_id != null
        ? `ingredient:${selectedItem.ingredient_id}`
        : selectedItem.batch_recipe_id != null
          ? `batch:${selectedItem.batch_recipe_id}`
          : 'unknown';

    return discrepancyMap.get(key) || [];
  }, [discrepancyMap, selectedItem]);

  const primaryDiscrepancy = selectedItemDiscrepancies[0] || null;

  const inventorySummary = React.useMemo(() => {
    const reviewCount = discrepancies.length;
    const ingredientCount = inventory.filter(item => item.batch_recipe_id === null).length;
    const batchCount = inventory.filter(item => item.batch_recipe_id !== null).length;
    const lowStockCount = inventory.filter(item => item.quantity_on_hand <= 10).length;

    return {
      reviewCount,
      ingredientCount,
      batchCount,
      lowStockCount,
    };
  }, [discrepancies.length, inventory]);

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

  useEffect(() => {
    const target = route.params?.focusReview;
    if (!target || isLoading) {
      return;
    }

    setTypeFilter('review');

    const matchedItem = inventory.find(item => {
      if (target.ingredientId != null && item.ingredient_id === target.ingredientId) {
        return true;
      }
      if (target.batchRecipeId != null && item.batch_recipe_id === target.batchRecipeId) {
        return true;
      }
      return false;
    });

    if (matchedItem) {
      setSelectedItem(matchedItem);
      setCountedQuantity('');
      setReviewReason('count_correction');
      setReviewNotes('');
      setReviewError(null);
      setShowLotModal(true);
    }

    navigation.setParams({ focusReview: undefined });
  }, [inventory, isLoading, navigation, route.params]);

  // Open lot breakdown modal
  const handleViewLots = (item: InventoryItem) => {
    setSelectedItem(item);
    setCountedQuantity('');
    setReviewReason('count_correction');
    setReviewNotes('');
    setReviewError(null);
    setShowLotModal(true);
  };

  // Open lot detail modal (for a specific lot)
  const handleViewLotDetail = (lotId: number) => {
    setSelectedLotId(lotId);
    const lot = selectedItem?.packaging_breakdown?.find(l => l.lot_id === lotId);
    setSelectedLotRemaining(lot?.remaining_quantity ?? null);
    setSelectedLotUnit(lot?.unit || selectedItem?.unit);
    setShowLotDetailModal(true);
    setAdjustQuantity('');
    setAdjustUsageType('manual_adjustment');
    setAdjustNotes('');
    setAdjustError(null);
  };

  const submitCurrentStockCount = async () => {
    if (!selectedItem) {
      setReviewError('Select an inventory item first');
      return;
    }

    const qty = Number(countedQuantity);
    if (!Number.isFinite(qty) || qty < 0) {
      setReviewError('Enter a quantity on hand of zero or greater');
      return;
    }

    try {
      const response = await setCurrentStock({
        inventory_id: selectedItem.inventory_id,
        counted_quantity: qty,
        reason: reviewReason,
        notes: reviewNotes.trim() || undefined,
      });

      const resolvedCount = Number(response.resolved_deduction_alerts || 0);
      const delta =
        Number(response.current_quantity_on_hand) - Number(response.previous_quantity_on_hand);
      const direction = delta > 0 ? 'added' : delta < 0 ? 'removed' : 'changed';
      const absoluteDelta = Math.abs(delta);

      setSnackbar({
        visible: true,
        message:
          resolvedCount > 0
            ? `Quantity on hand set to ${response.current_quantity_on_hand} ${selectedItem.unit}. Previous quantity on hand was ${response.previous_quantity_on_hand}; system ${direction} ${absoluteDelta}. ${resolvedCount} review ${resolvedCount === 1 ? 'alert cleared' : 'alerts cleared'}.`
            : `Quantity on hand set to ${response.current_quantity_on_hand} ${selectedItem.unit}. Previous quantity on hand was ${response.previous_quantity_on_hand}; system ${direction} ${absoluteDelta}.`,
        type: 'success',
      });
      setReviewError(null);
      setCountedQuantity('');
      setReviewNotes('');
      setShowLotModal(false);
      await refresh();
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to set current stock');
      setSnackbar({ visible: true, message: 'Failed to set current stock', type: 'error' });
    }
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
    setSelectedLotRemaining(prev => {
      if (prev === null) return prev;
      if (params.usageType === 'manual_addition') return prev + params.quantity;
      return prev - params.quantity;
    });
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
    const itemKey =
      item.ingredient_id != null
        ? `ingredient:${item.ingredient_id}`
        : item.batch_recipe_id != null
          ? `batch:${item.batch_recipe_id}`
          : 'unknown';
    const rowDiscrepancies = discrepancyMap.get(itemKey) || [];
    const hasReview = rowDiscrepancies.length > 0;

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

              {hasReview && (
                <View style={[styles.reviewBadge, { backgroundColor: '#fff3cd' }]}>
                  <MaterialCommunityIcons name="alert" size={14} color="#b26a00" />
                  <Text variant="labelSmall" style={{ color: '#b26a00', marginLeft: 4 }}>
                    {rowDiscrepancies.length} need review
                  </Text>
                </View>
              )}

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
    const lotUnit = lot.unit || selectedItem?.unit || '';

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
                  {lot.remaining_quantity} / {lot.quantity} {lotUnit} remaining
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
        <View style={styles.heroCard}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.heroIconWrap, { backgroundColor: `${theme.colors.primary}14` }]}>
                <MaterialCommunityIcons name="warehouse" size={28} color={theme.colors.primary} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="titleLarge" style={styles.heroTitle}>
                  Ingredient catalog and stock
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Search quickly, spot low stock, and jump into lot or review detail without losing
                  context.
                </Text>
              </View>
            </View>
            <View style={styles.headerItemCount}>
              <MaterialCommunityIcons
                name="package-variant"
                size={16}
                color={theme.colors.primary}
              />
              <Text style={{ marginLeft: 4, color: theme.colors.primary }}>
                {filteredInventory.length} items
              </Text>
            </View>
          </View>

          <View style={styles.heroBadgeRow}>
            <Chip compact style={styles.heroBadge}>
              {inventorySummary.ingredientCount} ingredients
            </Chip>
            <Chip compact style={styles.heroBadge}>
              {inventorySummary.batchCount} batch recipes
            </Chip>
            <Chip compact style={styles.heroBadge}>
              {inventorySummary.reviewCount} review items
            </Chip>
            <Chip compact style={styles.heroBadge}>
              {inventorySummary.lowStockCount} low stock
            </Chip>
          </View>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search ingredients..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Type Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {[
            { key: 'all', label: 'All items' },
            { key: 'ingredients', label: 'Ingredients' },
            { key: 'batches', label: 'Batch recipes' },
            { key: 'review', label: 'Needs review' },
          ].map(filter => (
            <Chip
              key={filter.key}
              selected={typeFilter === filter.key}
              onPress={() =>
                setTypeFilter(filter.key as 'all' | 'ingredients' | 'batches' | 'review')
              }
              style={styles.filterChip}
            >
              {filter.label}
            </Chip>
          ))}
        </ScrollView>

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

              {primaryDiscrepancy && (
                <>
                  <View style={styles.reviewSummaryCard}>
                    <Text variant="titleSmall" style={{ fontWeight: '600', marginBottom: 8 }}>
                      Needs review
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Quantity on hand in inventory: {primaryDiscrepancy.current_quantity_on_hand}{' '}
                      {selectedItem.unit}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Quantity needed for failed deduction: {primaryDiscrepancy.required_quantity}{' '}
                      {selectedItem.unit}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Shortfall: {primaryDiscrepancy.shortfall_quantity} {selectedItem.unit}
                    </Text>
                  </View>

                  <Text
                    variant="titleMedium"
                    style={{ marginTop: 16, marginBottom: 12, fontWeight: '600' }}
                  >
                    Set current stock
                  </Text>

                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Count what is physically on hand right now. The system will compare it to the
                    quantity on hand in inventory and reconcile automatically.
                  </Text>

                  <TextInput
                    label={`Current counted stock (${selectedItem.unit})`}
                    value={countedQuantity}
                    onChangeText={setCountedQuantity}
                    keyboardType="decimal-pad"
                    mode="outlined"
                    style={{ marginTop: 12, marginBottom: 8 }}
                  />

                  <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                    Reason
                  </Text>
                  <RadioButton.Group onValueChange={setReviewReason} value={reviewReason}>
                    {[
                      { key: 'count_correction', label: 'Count correction' },
                      { key: 'waste_not_logged', label: 'Waste not logged' },
                      { key: 'receipt_not_entered', label: 'Receipt not entered' },
                      { key: 'prep_variance', label: 'Prep variance' },
                      { key: 'other', label: 'Other' },
                    ].map(option => (
                      <Pressable
                        key={option.key}
                        onPress={() => setReviewReason(option.key)}
                        style={styles.reasonRow}
                      >
                        <RadioButton value={option.key} />
                        <Text>{option.label}</Text>
                      </Pressable>
                    ))}
                  </RadioButton.Group>

                  <TextInput
                    label="Notes (optional)"
                    value={reviewNotes}
                    onChangeText={setReviewNotes}
                    mode="outlined"
                    multiline
                    numberOfLines={2}
                    style={{ marginTop: 8, marginBottom: 4 }}
                  />

                  {reviewError && <HelperText type="error">{reviewError}</HelperText>}

                  <Button
                    mode="contained"
                    onPress={submitCurrentStockCount}
                    loading={reconciling}
                    disabled={reconciling}
                    style={{ marginTop: 8 }}
                  >
                    Set current stock
                  </Button>

                  <Divider style={{ marginVertical: 16 }} />
                </>
              )}

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
          onDismiss={() => {
            setShowLotDetailModal(false);
            setSelectedLotUnit(undefined);
          }}
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
                onPress={() => {
                  setShowLotDetailModal(false);
                  setSelectedLotUnit(undefined);
                }}
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
                  label={`Quantity (${selectedLotUnit || selectedItem?.unit || ''})`}
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
                  Lot remaining: {selectedLotRemaining ?? 'N/A'}{' '}
                  {selectedLotUnit || selectedItem?.unit || ''}
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroCard: {
    marginBottom: 14,
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
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontWeight: '700',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.82)',
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
    marginBottom: 12,
    borderRadius: 22,
    overflow: 'hidden',
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
    fontWeight: '700',
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
  reviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginLeft: 8,
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
    paddingHorizontal: 24,
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
  reviewSummaryCard: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff8e1',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
