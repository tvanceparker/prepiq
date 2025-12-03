// src/pages/inventory/components/po-wizard/POSupplierReview.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Card,
  Checkbox,
  Chip,
  IconButton,
  List,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { POSuggestionsResponse, POSuggestionGroup } from '../../../../interfaces/inventory';

interface POSupplierReviewProps {
  suggestions: POSuggestionsResponse;
  selectedItems: Map<string, number>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  expandedSuppliers: Set<number>;
  setExpandedSuppliers: React.Dispatch<React.SetStateAction<Set<number>>>;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
}

export default function POSupplierReview({
  suggestions,
  selectedItems,
  setSelectedItems,
  expandedSuppliers,
  setExpandedSuppliers,
  orderNotes,
  setOrderNotes,
}: POSupplierReviewProps): React.JSX.Element {
  const theme = useTheme();

  // Calculate totals
  const reviewTotals = React.useMemo(() => {
    let total = 0;
    let itemCount = 0;
    const supplierSet = new Set<number>();

    suggestions.all_items.forEach(item => {
      const key = `${item.supplier_id}-${item.ingredient_id}`;
      if (selectedItems.has(key)) {
        const qty = selectedItems.get(key) || item.quantity_to_order;
        total += qty * item.unit_price;
        itemCount++;
        supplierSet.add(item.supplier_id);
      }
    });

    return { itemCount, total, supplierCount: supplierSet.size };
  }, [suggestions, selectedItems]);

  // Toggle supplier expansion
  const toggleSupplierExpand = (supplierId: number) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(supplierId)) {
        next.delete(supplierId);
      } else {
        next.add(supplierId);
      }
      return next;
    });
  };

  // Toggle item selection
  const toggleItemSelection = (supplierId: number, ingredientId: number, suggestedQty: number) => {
    const key = `${supplierId}-${ingredientId}`;
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, suggestedQty);
      }
      return next;
    });
  };

  // Toggle all supplier items
  const toggleSupplierItems = (supplier: POSuggestionGroup) => {
    const supplierKeys = supplier.items.map(i => ({
      key: `${supplier.supplier_id}-${i.ingredient_id}`,
      qty: i.quantity_to_order,
    }));
    const allSelected = supplierKeys.every(k => selectedItems.has(k.key));

    setSelectedItems(prev => {
      const next = new Map(prev);
      if (allSelected) {
        supplierKeys.forEach(k => next.delete(k.key));
      } else {
        supplierKeys.forEach(k => next.set(k.key, k.qty));
      }
      return next;
    });
  };

  // Update item quantity
  const updateItemQty = (key: string, delta: number) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      const current = next.get(key) || 0;
      const newQty = Math.max(1, current + delta);
      next.set(key, newQty);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.reviewHeader}>
        <Text variant="titleMedium" style={styles.title}>
          Review Orders
        </Text>
        <Chip compact mode="outlined">
          {suggestions.forecast_source} forecast
        </Chip>
      </View>

      <Card style={styles.summaryCard} mode="contained">
        <Card.Content style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Items
            </Text>
            <Text variant="headlineSmall" style={styles.summaryValue}>
              {reviewTotals.itemCount}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Suppliers
            </Text>
            <Text variant="headlineSmall" style={styles.summaryValue}>
              {reviewTotals.supplierCount}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total
            </Text>
            <Text
              variant="headlineSmall"
              style={[styles.summaryValue, { color: theme.colors.primary }]}
            >
              ${reviewTotals.total.toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <ScrollView style={styles.scrollArea}>
        {suggestions.suggestions.map(supplier => {
          const supplierKeys = supplier.items.map(i => ({
            key: `${supplier.supplier_id}-${i.ingredient_id}`,
            qty: i.quantity_to_order,
          }));
          const allSelected = supplierKeys.every(k => selectedItems.has(k.key));
          const someSelected = supplierKeys.some(k => selectedItems.has(k.key));
          const supplierTotal = supplier.items.reduce((sum, item) => {
            const key = `${supplier.supplier_id}-${item.ingredient_id}`;
            if (selectedItems.has(key)) {
              return sum + (selectedItems.get(key) || item.quantity_to_order) * item.unit_price;
            }
            return sum;
          }, 0);

          return (
            <Card key={supplier.supplier_id} style={styles.supplierCard} mode="outlined">
              <List.Accordion
                title={supplier.supplier_name}
                description={`$${supplierTotal.toFixed(2)}`}
                expanded={expandedSuppliers.has(supplier.supplier_id)}
                onPress={() => toggleSupplierExpand(supplier.supplier_id)}
                left={props => (
                  <Checkbox
                    status={allSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'}
                    onPress={() => toggleSupplierItems(supplier)}
                  />
                )}
              >
                {supplier.items.map(item => {
                  const key = `${supplier.supplier_id}-${item.ingredient_id}`;
                  const isSelected = selectedItems.has(key);
                  const qty = selectedItems.get(key) || item.quantity_to_order;

                  return (
                    <View
                      key={key}
                      style={[styles.reviewItem, !isSelected && styles.reviewItemDisabled]}
                    >
                      <Checkbox
                        status={isSelected ? 'checked' : 'unchecked'}
                        onPress={() =>
                          toggleItemSelection(
                            supplier.supplier_id,
                            item.ingredient_id,
                            item.quantity_to_order
                          )
                        }
                      />
                      <View style={styles.itemInfo}>
                        <Text variant="bodyMedium">{item.ingredient_name}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Suggested: {item.quantity_to_order} {item.unit}
                        </Text>
                      </View>
                      <View style={styles.qtyControls}>
                        <IconButton
                          icon="minus"
                          size={16}
                          onPress={() => updateItemQty(key, -1)}
                          disabled={!isSelected}
                        />
                        <Text
                          style={[
                            styles.qtyText,
                            qty !== item.quantity_to_order && styles.qtyModified,
                          ]}
                        >
                          {qty}
                        </Text>
                        <IconButton
                          icon="plus"
                          size={16}
                          onPress={() => updateItemQty(key, 1)}
                          disabled={!isSelected}
                        />
                      </View>
                      <Text variant="bodyMedium" style={styles.itemPrice}>
                        ${(qty * item.unit_price).toFixed(2)}
                      </Text>
                    </View>
                  );
                })}
              </List.Accordion>
            </Card>
          );
        })}
      </ScrollView>

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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontWeight: '700',
  },
  scrollArea: {
    maxHeight: 280,
  },
  supplierCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewItemDisabled: {
    opacity: 0.5,
  },
  itemInfo: {
    flex: 1,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyText: {
    minWidth: 30,
    textAlign: 'center',
  },
  qtyModified: {
    fontWeight: '700',
  },
  itemPrice: {
    minWidth: 60,
    textAlign: 'right',
    fontWeight: '500',
  },
  notesInput: {
    marginTop: 12,
  },
});
