// src/pages/inventory/components/po-wizard/POIngredientReview.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, Text, TextInput, useTheme } from 'react-native-paper';
import { IngredientStockLevel, IngredientSupplierOption } from '../../../../interfaces/inventory';

interface POIngredientReviewProps {
  selectedIngredient: IngredientStockLevel;
  ingredientSupplier: IngredientSupplierOption;
  ingredientQty: number;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
}

export default function POIngredientReview({
  selectedIngredient,
  ingredientSupplier,
  ingredientQty,
  orderNotes,
  setOrderNotes,
}: POIngredientReviewProps): React.JSX.Element {
  const theme = useTheme();

  const total = ingredientQty * ingredientSupplier.pack_size * ingredientSupplier.unit_price;
  const deliveryDate = new Date(
    Date.now() + ingredientSupplier.lead_time_days * 24 * 60 * 60 * 1000
  );

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Review Your Order
      </Text>

      <Card style={styles.reviewCard} mode="outlined">
        <Card.Content>
          <View style={styles.reviewRow}>
            <Text
              variant="bodySmall"
              style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
            >
              Ingredient
            </Text>
            <Text variant="titleSmall" style={styles.value}>
              {selectedIngredient.ingredient_name}
            </Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.reviewRow}>
            <Text
              variant="bodySmall"
              style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
            >
              Supplier
            </Text>
            <Text variant="titleSmall" style={styles.value}>
              {ingredientSupplier.supplier_name}
            </Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.reviewRow}>
            <Text
              variant="bodySmall"
              style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
            >
              Quantity
            </Text>
            <Text variant="titleSmall" style={styles.value}>
              {ingredientQty * ingredientSupplier.pack_size} {ingredientSupplier.pack_unit}
            </Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.reviewRow}>
            <Text
              variant="bodySmall"
              style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
            >
              Unit Price
            </Text>
            <Text variant="titleSmall" style={styles.value}>
              ${ingredientSupplier.unit_price.toFixed(2)}
            </Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.reviewRow}>
            <Text
              variant="bodySmall"
              style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
            >
              Expected Delivery
            </Text>
            <Text variant="titleSmall" style={styles.value}>
              {deliveryDate.toLocaleDateString()}
            </Text>
          </View>
          <Divider style={styles.totalDivider} />

          <View style={styles.totalRow}>
            <Text variant="titleMedium" style={styles.value}>
              Total
            </Text>
            <Text
              variant="headlineMedium"
              style={[styles.totalPrice, { color: theme.colors.primary }]}
            >
              ${total.toFixed(2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

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
  reviewCard: {
    borderRadius: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {},
  value: {
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
  totalDivider: {
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
  notesInput: {
    marginTop: 16,
  },
});
