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

const formatValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const formatSelectionRule = (rule?: string): string => {
  if (rule === 'preferred_lowest_priority') {
    return 'preferred supplier rule';
  }
  if (rule === 'fallback_lowest_priority') {
    return 'fallback to lowest supplier priority';
  }
  return rule || 'supplier rule';
};

const getForecastSourceLabel = (suggestions: POSuggestionsResponse): string =>
  suggestions.forecast_source_type === 'eod' ? 'EOD' : 'On-demand';

const formatForecastGeneratedAt = (value: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleString();
};

const formatConfidence = (value?: number | null): string | null => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return `${Math.round(value * 100)}% confidence`;
};

const getAssumptionWarnings = (item: POSuggestionsResponse['all_items'][number]): string[] => {
  const flags = item.explanation?.assumption_flags;
  if (!flags) {
    return [];
  }

  const warnings: string[] = [];
  if (flags.lead_time_source !== 'supplier') {
    warnings.push('lead time fallback');
  }
  if (flags.moq_source !== 'supplier') {
    warnings.push('MOQ fallback');
  }
  if (flags.shelf_life_source === 'missing_assumed_zero') {
    warnings.push('shelf life assumed 0');
  }
  if (flags.inventory_source !== 'inventory_summary') {
    warnings.push('inventory fallback');
  }
  if (flags.unit_conversion_fallback) {
    warnings.push('unit conversion fallback');
  }
  if (flags.pricing_missing) {
    warnings.push('pricing missing');
  }
  if (flags.abc_defaulted) {
    warnings.push('ABC defaulted to C');
  }
  return warnings;
};

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
        <View>
          <Text variant="titleMedium" style={styles.title}>
            Review Orders
          </Text>
          <View style={styles.forecastMetaRow}>
            <Chip compact mode="outlined">
              {getForecastSourceLabel(suggestions)} forecast
            </Chip>
            {suggestions.forecast_status !== 'ready' && (
              <Chip compact style={styles.forecastStatusChip}>
                {suggestions.forecast_status}
              </Chip>
            )}
          </View>
          {suggestions.forecast_generated_at && (
            <Text variant="bodySmall" style={styles.forecastMetaText}>
              {suggestions.forecast_reused ? 'Reused' : 'Generated'}{' '}
              {getForecastSourceLabel(suggestions)} forecast on{' '}
              {formatForecastGeneratedAt(suggestions.forecast_generated_at)}
            </Text>
          )}
          {(suggestions.forecast_version ||
            suggestions.forecast_confidence_score !== undefined) && (
            <Text variant="bodySmall" style={styles.forecastMetaText}>
              {suggestions.forecast_version
                ? `Version ${suggestions.forecast_version}`
                : 'Version n/a'}
              {formatConfidence(suggestions.forecast_confidence_score)
                ? ` · ${formatConfidence(suggestions.forecast_confidence_score)}`
                : ''}
            </Text>
          )}
          {suggestions.forecast_status_message && (
            <Text variant="bodySmall" style={[styles.forecastMetaText, styles.forecastWarningText]}>
              {suggestions.forecast_status_message}
            </Text>
          )}
        </View>
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
                  const explanation = item.explanation;
                  const assumptionWarnings = getAssumptionWarnings(item);

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
                        {item.explanation?.summary ? (
                          <Text
                            variant="bodySmall"
                            style={[
                              styles.itemExplanation,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            {item.explanation.summary}
                          </Text>
                        ) : null}
                        {explanation ? (
                          <View style={styles.explanationCard}>
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.explanationLine,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              Stock {formatValue(explanation.why_reorder.current_stock)}{' '}
                              {explanation.why_reorder.current_unit} vs reorder point{' '}
                              {formatValue(explanation.why_reorder.reorder_point)}.
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.explanationLine,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              Lead {formatValue(explanation.why_reorder.lead_demand)} + shelf{' '}
                              {formatValue(explanation.why_reorder.shelf_demand)} + safety{' '}
                              {formatValue(explanation.why_reorder.safety_stock)} = target{' '}
                              {formatValue(explanation.why_reorder.reorder_target)}.
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.explanationLine,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              ABC {explanation.policy_factors.abc_class} x
                              {formatValue(explanation.policy_factors.abc_multiplier)}; MOQ floor{' '}
                              {formatValue(explanation.policy_factors.moq_floor)}; final before
                              packs{' '}
                              {formatValue(
                                explanation.quantity_factors.final_quantity_before_pack_rounding
                              )}
                              .
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.explanationLine,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              {formatValue(explanation.quantity_factors.packs_to_order)} packs x{' '}
                              {formatValue(explanation.quantity_factors.quantity_per_pack)}{' '}
                              {explanation.quantity_factors.supplier_unit} ={' '}
                              {formatValue(explanation.quantity_factors.total_quantity_ordered)}{' '}
                              {explanation.quantity_factors.supplier_unit}.
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={[
                                styles.explanationLine,
                                { color: theme.colors.onSurfaceVariant },
                              ]}
                            >
                              Supplier: {explanation.supplier_factors.selected_supplier} (
                              {formatSelectionRule(explanation.supplier_factors.selection_rule)}).
                            </Text>
                            {assumptionWarnings.length > 0 ? (
                              <Text
                                variant="bodySmall"
                                style={[styles.assumptionLine, { color: theme.colors.error }]}
                              >
                                Assumptions: {assumptionWarnings.join(', ')}.
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontWeight: '600',
  },
  forecastMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  forecastStatusChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    marginLeft: 8,
  },
  forecastMetaText: {
    marginTop: 6,
  },
  forecastWarningText: {
    color: '#b45309',
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
  itemExplanation: {
    marginTop: 4,
  },
  explanationCard: {
    marginTop: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  explanationLine: {
    marginTop: 2,
  },
  assumptionLine: {
    marginTop: 6,
    fontWeight: '500',
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
