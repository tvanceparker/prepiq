// src/pages/inventory/components/po-wizard/POIngredientReview.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import type { IngredientCartItem } from './types';

interface POIngredientReviewProps {
  cartItems: IngredientCartItem[];
  onUpdateCartItemQty: (ingredientId: number, supplierId: number, qtyPacks: number) => void;
  onRemoveCartItem: (ingredientId: number, supplierId: number) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
}

export default function POIngredientReview({
  cartItems,
  onUpdateCartItemQty,
  onRemoveCartItem,
  orderNotes,
  setOrderNotes,
}: POIngredientReviewProps): React.JSX.Element {
  const theme = useTheme();

  const grouped = React.useMemo(() => {
    const map = new Map<
      number,
      { supplierName: string; leadTime: number; items: IngredientCartItem[] }
    >();
    cartItems.forEach(item => {
      if (!map.has(item.supplier.supplier_id)) {
        map.set(item.supplier.supplier_id, {
          supplierName: item.supplier.supplier_name,
          leadTime: item.supplier.lead_time_days,
          items: [],
        });
      }
      map.get(item.supplier.supplier_id)!.items.push(item);
    });
    return Array.from(map.entries()).map(([supplierId, payload]) => ({
      supplierId,
      ...payload,
    }));
  }, [cartItems]);

  const totals = React.useMemo(() => {
    const supplierSet = new Set<number>();
    let total = 0;
    let itemCount = 0;
    cartItems.forEach(item => {
      supplierSet.add(item.supplier.supplier_id);
      itemCount += 1;
      total += item.qtyPacks * item.supplier.pack_size * item.supplier.unit_price;
    });
    return { supplierCount: supplierSet.size, itemCount, total };
  }, [cartItems]);

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Review Your Order
      </Text>

      <Card style={styles.summaryCard} mode="outlined">
        <Card.Content style={styles.summaryRow}>
          <View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Items
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {totals.itemCount}
            </Text>
          </View>
          <View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Suppliers
            </Text>
            <Text variant="titleMedium" style={styles.summaryValue}>
              {totals.supplierCount}
            </Text>
          </View>
          <View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.summaryValue, { color: theme.colors.primary }]}
            >
              ${totals.total.toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {grouped.map(group => (
        <Card key={group.supplierId} style={styles.reviewCard} mode="outlined">
          <Card.Title
            title={group.supplierName}
            subtitle={`Lead time: ${group.leadTime}d`}
            titleStyle={{ fontWeight: '700' }}
          />
          <Card.Content>
            {group.items.map((item, idx) => {
              const lineTotal = item.qtyPacks * item.supplier.pack_size * item.supplier.unit_price;
              return (
                <View
                  key={`${item.ingredient.ingredient_id}-${item.supplier.supplier_id}-${idx}`}
                  style={styles.reviewRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={styles.value}>
                      {item.ingredient.ingredient_name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.qtyPacks * item.supplier.pack_size} {item.supplier.pack_unit}
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <IconButton
                      icon="minus"
                      size={16}
                      onPress={() =>
                        onUpdateCartItemQty(
                          item.ingredient.ingredient_id,
                          item.supplier.supplier_id,
                          Math.max(1, item.qtyPacks - 1)
                        )
                      }
                    />
                    <Text style={styles.qtyText}>{item.qtyPacks}</Text>
                    <IconButton
                      icon="plus"
                      size={16}
                      onPress={() =>
                        onUpdateCartItemQty(
                          item.ingredient.ingredient_id,
                          item.supplier.supplier_id,
                          item.qtyPacks + 1
                        )
                      }
                    />
                  </View>
                  <Text variant="bodyMedium" style={styles.lineTotal}>
                    ${lineTotal.toFixed(2)}
                  </Text>
                  <IconButton
                    icon="delete"
                    iconColor={theme.colors.error}
                    onPress={() =>
                      onRemoveCartItem(item.ingredient.ingredient_id, item.supplier.supplier_id)
                    }
                  />
                </View>
              );
            })}
          </Card.Content>
        </Card>
      ))}

      <TextInput
        label="Order Notes (optional)"
        value={orderNotes}
        onChangeText={setOrderNotes}
        mode="outlined"
        multiline
        numberOfLines={2}
        style={styles.notesInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: {
    fontWeight: '700',
  },
  reviewCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  value: {
    fontWeight: '600',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyText: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '700',
  },
  lineTotal: {
    minWidth: 72,
    textAlign: 'right',
    fontWeight: '600',
  },
  notesInput: {
    marginTop: 8,
  },
});
