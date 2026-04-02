// src/pages/inventory/components/po-wizard/POIngredientBrowser.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  ActivityIndicator,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { IngredientStockLevel, IngredientSupplierOption } from '../../../../interfaces/inventory';
import type { IngredientCartItem } from './types';

interface POIngredientBrowserProps {
  stockLevels: IngredientStockLevel[];
  stockLoading: boolean;
  selectedIngredient: IngredientStockLevel | null;
  setSelectedIngredient: React.Dispatch<React.SetStateAction<IngredientStockLevel | null>>;
  ingredientSuppliers: IngredientSupplierOption[];
  suppliersLoading: boolean;
  ingredientSupplier: IngredientSupplierOption | null;
  setIngredientSupplier: React.Dispatch<React.SetStateAction<IngredientSupplierOption | null>>;
  ingredientQty: number;
  setIngredientQty: React.Dispatch<React.SetStateAction<number>>;
  cartItems: IngredientCartItem[];
  onAddToCart: (item: IngredientCartItem) => void;
  onUpdateCartItemQty: (ingredientId: number, supplierId: number, qtyPacks: number) => void;
  onRemoveCartItem: (ingredientId: number, supplierId: number) => void;
}

const getStockStatusColor = (status: string): string => {
  switch (status) {
    case 'critical':
      return '#f44336';
    case 'low':
      return '#ff9800';
    case 'warning':
      return '#2196f3';
    case 'ok':
      return '#4caf50';
    default:
      return '#9e9e9e';
  }
};

export default function POIngredientBrowser({
  stockLevels,
  stockLoading,
  selectedIngredient,
  setSelectedIngredient,
  ingredientSuppliers,
  suppliersLoading,
  ingredientSupplier,
  setIngredientSupplier,
  ingredientQty,
  setIngredientQty,
  cartItems,
  onAddToCart,
  onUpdateCartItemQty,
  onRemoveCartItem,
}: POIngredientBrowserProps): React.JSX.Element {
  const theme = useTheme();

  // Sort stock levels by status (critical first)
  const sortedStockLevels = React.useMemo(() => {
    const priority: Record<string, number> = { critical: 0, low: 1, warning: 2, ok: 3 };
    return [...stockLevels].sort((a, b) => (priority[a.status] ?? 4) - (priority[b.status] ?? 4));
  }, [stockLevels]);

  // Ingredient List View
  if (!selectedIngredient) {
    return (
      <View style={styles.container}>
        <Text variant="titleMedium" style={styles.title}>
          Select an Ingredient
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Items sorted by stock status - critical first
        </Text>

        {stockLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollArea}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {sortedStockLevels.map((ing, idx) => (
              <Card
                key={`${ing.ingredient_id}-${idx}`}
                style={styles.ingredientCard}
                mode="outlined"
                onPress={() => setSelectedIngredient(ing)}
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardContent}>
                      <View style={styles.nameRow}>
                        <Text variant="titleSmall" style={styles.ingredientName}>
                          {ing.ingredient_name}
                        </Text>
                        <Chip
                          compact
                          style={{ backgroundColor: getStockStatusColor(ing.status) }}
                          textStyle={styles.statusChipText}
                        >
                          {ing.status.toUpperCase()}
                        </Chip>
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Stock: {ing.current_stock.toFixed(1)} {ing.unit} • Reorder:{' '}
                        {ing.reorder_point.toFixed(1)}
                      </Text>
                    </View>
                    <Badge style={{ backgroundColor: theme.colors.primary }}>
                      {ing.supplier_count}
                    </Badge>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        )}

        {cartItems.length > 0 && (
          <Card style={styles.cartCard} mode="outlined">
            <Card.Title title={`Current Draft (${cartItems.length})`} />
            <Card.Content>
              {cartItems.map((item, idx) => (
                <View
                  key={`${item.ingredient.ingredient_id}-${item.supplier.supplier_id}-${idx}`}
                  style={styles.cartRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                      {item.ingredient.ingredient_name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.supplier.supplier_name}
                    </Text>
                  </View>
                  <View style={styles.qtyControls}>
                    <IconButton
                      icon="minus"
                      size={18}
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
                      size={18}
                      onPress={() =>
                        onUpdateCartItemQty(
                          item.ingredient.ingredient_id,
                          item.supplier.supplier_id,
                          item.qtyPacks + 1
                        )
                      }
                    />
                  </View>
                  <Text variant="bodySmall" style={{ minWidth: 80, textAlign: 'right' }}>
                    {item.qtyPacks * item.supplier.pack_size} {item.supplier.pack_unit}
                  </Text>
                  <IconButton
                    icon="delete"
                    iconColor={theme.colors.error}
                    onPress={() =>
                      onRemoveCartItem(item.ingredient.ingredient_id, item.supplier.supplier_id)
                    }
                  />
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </View>
    );
  }

  // Supplier Selection View
  return (
    <View style={styles.container}>
      <Button
        mode="text"
        icon="arrow-left"
        onPress={() => {
          setSelectedIngredient(null);
          setIngredientSupplier(null);
          setIngredientQty(1);
        }}
        style={styles.backButton}
      >
        Back to Ingredients
      </Button>

      <Card style={styles.selectedIngredientCard} mode="outlined">
        <Card.Content style={styles.selectedCardContent}>
          <MaterialCommunityIcons name="food-variant" size={32} color={theme.colors.primary} />
          <View>
            <Text variant="titleMedium" style={styles.ingredientName}>
              {selectedIngredient.ingredient_name}
            </Text>
            <View style={styles.nameRow}>
              <Chip
                compact
                style={{ backgroundColor: getStockStatusColor(selectedIngredient.status) }}
                textStyle={styles.statusChipText}
              >
                {selectedIngredient.status.toUpperCase()}
              </Chip>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {selectedIngredient.current_stock.toFixed(1)} {selectedIngredient.unit}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Text variant="titleSmall" style={styles.sectionTitle}>
        Choose Supplier
      </Text>

      {suppliersLoading ? (
        <ActivityIndicator style={styles.loadingIndicator} />
      ) : ingredientSuppliers.length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          No suppliers configured for this ingredient.
        </Text>
      ) : (
        <ScrollView
          style={styles.supplierScrollArea}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
          {ingredientSuppliers.map(sup => (
            <Card
              key={sup.supplier_id}
              style={[
                styles.supplierCard,
                ingredientSupplier?.supplier_id === sup.supplier_id && {
                  borderColor: theme.colors.primary,
                  borderWidth: 2,
                },
              ]}
              mode="outlined"
              onPress={() => setIngredientSupplier(sup)}
            >
              <Card.Content>
                <View style={styles.supplierRow}>
                  <View style={styles.supplierInfo}>
                    <View style={styles.nameRow}>
                      <Text variant="titleSmall" style={styles.ingredientName}>
                        {sup.supplier_name}
                      </Text>
                      {sup.is_preferred && (
                        <Chip
                          compact
                          mode="flat"
                          style={{ backgroundColor: theme.colors.primaryContainer }}
                        >
                          Preferred
                        </Chip>
                      )}
                    </View>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {sup.lead_time_days}d lead • {sup.pack_size} {sup.pack_unit}
                    </Text>
                  </View>
                  <Text
                    variant="titleMedium"
                    style={[styles.price, { color: theme.colors.primary }]}
                  >
                    ${sup.unit_price.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      {ingredientSupplier && (
        <Card style={styles.qtyCard} mode="outlined">
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Order Quantity
            </Text>
            <View style={styles.qtyRow}>
              <IconButton
                icon="minus"
                mode="contained"
                onPress={() => setIngredientQty(Math.max(1, ingredientQty - 1))}
              />
              <TextInput
                value={ingredientQty.toString()}
                onChangeText={t => setIngredientQty(Math.max(1, parseInt(t) || 1))}
                keyboardType="number-pad"
                style={styles.qtyInput}
                mode="outlined"
                dense
              />
              <IconButton
                icon="plus"
                mode="contained"
                onPress={() => setIngredientQty(ingredientQty + 1)}
              />
              <Text variant="bodyMedium" style={styles.qtyLabel}>
                × {ingredientSupplier.pack_size} = {ingredientQty * ingredientSupplier.pack_size}{' '}
                {ingredientSupplier.pack_unit}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.totalRow}>
              <Text variant="titleSmall">Total</Text>
              <Text
                variant="headlineSmall"
                style={[styles.totalPrice, { color: theme.colors.primary }]}
              >
                $
                {(
                  ingredientQty *
                  ingredientSupplier.pack_size *
                  ingredientSupplier.unit_price
                ).toFixed(2)}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button
                mode="contained"
                onPress={() => {
                  onAddToCart({
                    ingredient: selectedIngredient,
                    supplier: ingredientSupplier,
                    qtyPacks: ingredientQty,
                  });
                  setSelectedIngredient(null);
                  setIngredientSupplier(null);
                  setIngredientQty(1);
                }}
              >
                Add to order
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  scrollArea: {
    maxHeight: 350,
  },
  ingredientCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingredientName: {
    fontWeight: '600',
  },
  statusChipText: {
    color: '#fff',
    fontSize: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  selectedIngredientCard: {
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingIndicator: {
    padding: 20,
  },
  emptyText: {
    padding: 16,
  },
  supplierScrollArea: {
    maxHeight: 200,
  },
  supplierCard: {
    marginBottom: 8,
    borderRadius: 12,
  },
  supplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierInfo: {
    flex: 1,
  },
  price: {
    fontWeight: '600',
  },
  qtyCard: {
    marginTop: 16,
    borderRadius: 12,
  },
  cartCard: {
    marginTop: 12,
    borderRadius: 12,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyText: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '600',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyInput: {
    width: 70,
    textAlign: 'center',
  },
  qtyLabel: {
    marginLeft: 8,
  },
  divider: {
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPrice: {
    fontWeight: '700',
  },
});
