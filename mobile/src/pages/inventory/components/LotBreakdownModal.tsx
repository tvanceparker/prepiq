// src/pages/inventory/components/LotBreakdownModal.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Divider,
  IconButton,
  Card,
  ProgressBar,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { InventoryItem, LotBreakdown } from '../../../interfaces/inventory';

interface LotBreakdownModalProps {
  visible: boolean;
  onDismiss: () => void;
  item: InventoryItem | null;
  onViewLotDetail: (lotId: number) => void;
  formatDate: (dateStr: string | null | undefined) => string;
}

export function LotBreakdownModal({
  visible,
  onDismiss,
  item,
  onViewLotDetail,
  formatDate,
}: LotBreakdownModalProps): React.JSX.Element {
  const theme = useTheme();

  const renderLotItem = (lot: LotBreakdown, index: number) => {
    const usagePercent =
      lot.quantity > 0 ? ((lot.quantity - lot.remaining_quantity) / lot.quantity) * 100 : 0;

    return (
      <Card key={lot.lot_id || index} style={styles.lotCard} mode="outlined">
        <Pressable onPress={() => onViewLotDetail(lot.lot_id)}>
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

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        {item && (
          <ScrollView>
            <View style={styles.modalHeader}>
              <View>
                <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                  {item.ingredient_name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.category || 'Uncategorized'}
                </Text>
              </View>
              <IconButton
                icon={() => (
                  <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
                )}
                onPress={onDismiss}
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
                  {item.quantity_on_hand}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  On Hand ({item.unit})
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
                  {item.packaging_breakdown?.length || 0}
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

            {!item.packaging_breakdown || item.packaging_breakdown.length === 0 ? (
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
              item.packaging_breakdown.map((lot, index) => renderLotItem(lot, index))
            )}
          </ScrollView>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
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
});

export default LotBreakdownModal;
