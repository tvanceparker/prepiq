// src/pages/inventory/components/LotDetailModal.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Divider,
  IconButton,
  ActivityIndicator,
  TextInput,
  Button,
  useTheme,
  HelperText,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { LotInfo, UsageLog } from '../../../interfaces/inventory';

interface LotDetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  lotId: number | null;
  lotInfo: LotInfo | null;
  usedLogs: UsageLog[];
  wastedLogs: UsageLog[];
  loading: boolean;
  formatDate: (dateStr: string | null | undefined) => string;
  onAdjust: (params: { quantity: number; usageType: string; notes?: string }) => Promise<void>;
  adjusting: boolean;
  lotRemaining?: number | null;
  unit?: string;
}

export function LotDetailModal({
  visible,
  onDismiss,
  lotId,
  lotInfo,
  usedLogs,
  wastedLogs,
  loading,
  formatDate,
  onAdjust,
  adjusting,
  lotRemaining,
  unit,
}: LotDetailModalProps): React.JSX.Element {
  const theme = useTheme();

  const [quantity, setQuantity] = useState('');
  const [usageType, setUsageType] = useState('manual_adjustment');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuantity('');
      setUsageType('manual_adjustment');
      setNotes('');
      setError(null);
    }
  }, [visible, lotId]);

  const handleSubmit = async () => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a quantity greater than zero');
      return;
    }
    if (usageType !== 'manual_addition' && lotRemaining !== undefined && lotRemaining !== null) {
      if (qty > lotRemaining) {
        setError('Cannot subtract more than the lot has remaining');
        return;
      }
    }

    try {
      await onAdjust({ quantity: qty, usageType, notes: notes.trim() || undefined });
      setQuantity('');
      setNotes('');
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to adjust lot');
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
      >
        <ScrollView>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              Lot #{lotId} Details
            </Text>
            <IconButton
              icon={() => (
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
              )}
              onPress={onDismiss}
            />
          </View>

          <Divider />

          {loading ? (
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
                      <Text variant="bodyMedium">{formatDate(lotInfo.spoilage_expected_date)}</Text>
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
                <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 12 }}>
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
                label={`Quantity (${unit || ''})`}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                mode="outlined"
              />

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginVertical: 8 }}
              >
                {[
                  { key: 'manual_addition', label: 'Add' },
                  { key: 'manual_adjustment', label: 'Adjust (-)' },
                  { key: 'waste', label: 'Waste' },
                  { key: 'spoilage', label: 'Spoilage' },
                ].map(option => (
                  <Button
                    key={option.key}
                    mode={usageType === option.key ? 'contained' : 'outlined'}
                    style={{ marginRight: 8 }}
                    onPress={() => setUsageType(option.key)}
                    compact
                  >
                    {option.label}
                  </Button>
                ))}
              </ScrollView>

              <TextInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                multiline
                numberOfLines={2}
              />

              <HelperText type="info">
                Lot remaining: {lotRemaining ?? 'N/A'} {unit || ''}
              </HelperText>

              {error && (
                <HelperText type="error" visible>
                  {error}
                </HelperText>
              )}

              <Button
                mode="contained"
                onPress={handleSubmit}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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

export default LotDetailModal;
