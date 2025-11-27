// src/pages/inventory/components/InventoryItemCard.tsx
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { InventoryItem } from '../../../interfaces/inventory';

interface StockLevel {
  color: string;
  label: string;
  icon: string;
}

interface InventoryItemCardProps {
  item: InventoryItem;
  onPress?: (item: InventoryItem) => void;
  getStockLevel: (quantity: number, reorderPoint?: number) => StockLevel;
}

export function InventoryItemCard({
  item,
  onPress,
  getStockLevel,
}: InventoryItemCardProps): React.JSX.Element {
  const theme = useTheme();
  const stockLevel = getStockLevel(item.quantity_on_hand);
  const lotsCount = item.packaging_breakdown?.length || 0;
  const isBatchRecipe = item.batch_recipe_id !== null;

  return (
    <Card style={styles.itemCard} mode="outlined">
      <Pressable onPress={() => onPress?.(item)}>
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
              <Text variant="headlineMedium" style={[styles.quantity, { color: stockLevel.color }]}>
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

            <Pressable style={styles.lotsButton} onPress={() => onPress?.(item)}>
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
}

const styles = StyleSheet.create({
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
});

export default InventoryItemCard;
