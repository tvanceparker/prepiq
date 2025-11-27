// src/pages/prep/WasteLogs.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  FAB,
  useTheme,
  SegmentedButtons,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useWasteLogs, usePrepIngredients } from '../../hooks/usePrep';
import { AuthContext } from '../../contexts/AuthContext';
import { WasteLog } from '../../interfaces/prep';

type WasteReason = 'expired' | 'damaged' | 'spoiled' | 'over_production' | 'other';

const WASTE_REASONS: { value: WasteReason; label: string; icon: string }[] = [
  { value: 'expired', label: 'Expired', icon: 'calendar-clock' },
  { value: 'spoiled', label: 'Spoiled', icon: 'food-off' },
  { value: 'damaged', label: 'Damaged', icon: 'package-variant-remove' },
  { value: 'over_production', label: 'Over Production', icon: 'trending-up' },
  { value: 'other', label: 'Other', icon: 'help-circle' },
];

export default function WasteLogs(): React.ReactElement {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [reasonMenuVisible, setReasonMenuVisible] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    ingredient_id: 0,
    ingredient_name: '',
    quantity: '',
    unit: '',
    reason: 'spoiled' as WasteReason,
    notes: '',
  });

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  // Queries & mutations
  const { logs: wasteLogs = [], loading: isLoading, refresh, createWasteLog, creating } = useWasteLogs({ start_date: startDate, end_date: endDate });
  const { ingredients = [] } = usePrepIngredients();

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Stats
  const stats = React.useMemo(() => {
    const byReason: Record<string, number> = {};
    let totalQuantity = 0;
    let estimatedCost = 0;

    wasteLogs.forEach((log: WasteLog) => {
      const reason = log.reason || 'other';
      byReason[reason] = (byReason[reason] || 0) + 1;
      totalQuantity += log.quantity_wasted || 0;
      // estimatedCost calculation skipped - no unit_cost in WasteLog
    });

    return { byReason, totalQuantity, estimatedCost, count: wasteLogs.length };
  }, [wasteLogs]);

  // Open create dialog
  const openCreate = () => {
    setFormData({
      ingredient_id: 0,
      ingredient_name: '',
      quantity: '',
      unit: '',
      reason: 'spoiled',
      notes: '',
    });
    setShowCreateDialog(true);
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.ingredient_name.trim() || !formData.quantity) return;
    await createWasteLog({
      ingredient_id: formData.ingredient_id || undefined,
      quantity_wasted: parseFloat(formData.quantity),
      unit: formData.unit || 'units',
      waste_type: formData.reason as any,
      reason: formData.reason,
      notes: formData.notes || undefined,
    });
    setShowCreateDialog(false);
  };

  // Get reason styling
  const getReasonStyle = (reason: string) => {
    switch (reason) {
      case 'expired':
        return { color: '#9c27b0', icon: 'calendar-clock' };
      case 'spoiled':
        return { color: '#f44336', icon: 'food-off' };
      case 'damaged':
        return { color: '#ff9800', icon: 'package-variant-remove' };
      case 'over_production':
        return { color: '#2196f3', icon: 'trending-up' };
      default:
        return { color: '#9e9e9e', icon: 'help-circle' };
    }
  };

  const renderItem = ({ item }: { item: WasteLog }) => {
    const reasonStyle = getReasonStyle(item.reason);

    return (
      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.cardContent}>
          <View style={[styles.reasonIndicator, { backgroundColor: reasonStyle.color }]}>
            <MaterialCommunityIcons name={reasonStyle.icon as any} size={18} color="#fff" />
          </View>

          <View style={styles.itemInfo}>
            <Text variant="titleSmall" style={styles.itemName} numberOfLines={1}>
              {item.ingredient_name || 'Unknown Item'}
            </Text>
            <View style={styles.detailRow}>
              <Chip
                compact
                style={[styles.reasonChip, { backgroundColor: reasonStyle.color }]}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                {item.reason?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Chip>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString() : '--'}
              </Text>
            </View>
            {item.notes && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
                {item.notes}
              </Text>
            )}
          </View>

          <View style={styles.quantitySection}>
            <Text variant="titleMedium" style={[styles.quantity, { color: '#f44336' }]}>
              -{item.quantity_wasted}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.unit || 'units'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && wasteLogs.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading waste logs...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="delete-clock" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Waste Logs
            </Text>
          </View>
          <Chip icon="alert">{stats.count} entries</Chip>
        </View>

        {/* Date Range Selector */}
        <SegmentedButtons
          value={dateRange}
          onValueChange={value => setDateRange(value as any)}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          style={styles.segmented}
        />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: '#f44336', fontWeight: '700' }}>
              {stats.count}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Entries</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {stats.totalQuantity.toFixed(1)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Units Lost</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: '#ff9800', fontWeight: '700' }}>
              ${stats.estimatedCost.toFixed(0)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Est. Cost</Text>
          </View>
        </View>
      </Surface>

      {/* Waste Logs List */}
      {wasteLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="leaf"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No waste logged
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Great job keeping waste low!
          </Text>
        </View>
      ) : (
        <FlatList
          data={wasteLogs}
          keyExtractor={item => item.waste_log_id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
        label="Log Waste"
      />

      {/* Create Dialog */}
      <Portal>
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>Log Waste</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <View style={{ padding: 16 }}>
              <TextInput
                label="Item Name *"
                value={formData.ingredient_name}
                onChangeText={text => setFormData(f => ({ ...f, ingredient_name: text }))}
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.row}>
                <TextInput
                  label="Quantity *"
                  value={formData.quantity}
                  onChangeText={text => setFormData(f => ({ ...f, quantity: text }))}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Unit"
                  value={formData.unit}
                  onChangeText={text => setFormData(f => ({ ...f, unit: text }))}
                  mode="outlined"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              {/* Reason Selector */}
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>Reason *</Text>
              <View style={styles.reasonButtons}>
                {WASTE_REASONS.map(reason => (
                  <Chip
                    key={reason.value}
                    selected={formData.reason === reason.value}
                    onPress={() => setFormData(f => ({ ...f, reason: reason.value }))}
                    style={styles.reasonButton}
                    showSelectedCheck={false}
                    icon={reason.icon as any}
                    mode={formData.reason === reason.value ? 'flat' : 'outlined'}
                  >
                    {reason.label}
                  </Chip>
                ))}
              </View>

              <TextInput
                label="Notes"
                value={formData.notes}
                onChangeText={text => setFormData(f => ({ ...f, notes: text }))}
                mode="outlined"
                multiline
                style={[styles.input, { marginTop: 12 }]}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={creating}
              disabled={!formData.ingredient_name.trim() || !formData.quantity}
            >
              Log Waste
            </Button>
          </Dialog.Actions>
        </Dialog>
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
  segmented: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  reasonChip: {
    height: 20,
  },
  quantitySection: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontWeight: '700',
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
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  reasonButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonButton: {
    marginBottom: 4,
  },
});
