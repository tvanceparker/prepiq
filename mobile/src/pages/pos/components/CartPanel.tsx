// src/pages/pos/components/CartPanel.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  Divider,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { MenuItem } from '../../../interfaces/orders';

export interface CartItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  modifiers?: Array<{ mod_type: string; note?: string }>;
}

interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (menuItemId: number, quantity: number) => void;
  onRemoveItem: (menuItemId: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  onPayNow?: () => void;
  isSubmitting?: boolean;
}

const CartPanel: React.FC<CartPanelProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  onPayNow,
  isSubmitting = false,
}) => {
  const theme = useTheme();

  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
  const tax = subtotal * 0.0825; // 8.25% tax
  const total = subtotal + tax;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="cart" size={24} color={theme.colors.primary} />
        <Text variant="titleMedium" style={styles.headerTitle}>
          Current Order
        </Text>
        {items.length > 0 && (
          <Button mode="text" compact onPress={onClearCart}>
            Clear
          </Button>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="cart-outline"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No items in order
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Tap menu items to add them
          </Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.itemsList}>
            {items.map(item => (
              <Card key={item.menu_item_id} style={styles.itemCard} mode="outlined">
                <Card.Content style={styles.itemContent}>
                  <View style={styles.itemInfo}>
                    <Text variant="bodyMedium" style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <View style={styles.priceRow}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        ${item.unit_price.toFixed(2)} × {item.quantity}
                      </Text>
                      <Text variant="bodyMedium" style={styles.itemTotal}>
                        ${(item.unit_price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
                        {item.modifiers.length} modifier(s)
                      </Text>
                    )}
                  </View>

                  <View style={styles.quantityControls}>
                    <IconButton
                      icon="minus"
                      size={16}
                      mode="outlined"
                      onPress={() => onUpdateQuantity(item.menu_item_id, item.quantity - 1)}
                    />
                    <Text variant="bodyMedium" style={styles.quantityText}>
                      {item.quantity}
                    </Text>
                    <IconButton
                      icon="plus"
                      size={16}
                      mode="outlined"
                      onPress={() => onUpdateQuantity(item.menu_item_id, item.quantity + 1)}
                    />
                    <IconButton
                      icon="delete"
                      size={16}
                      iconColor="#f44336"
                      onPress={() => onRemoveItem(item.menu_item_id)}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>

          <Divider style={styles.divider} />

          {/* Totals */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text variant="bodyMedium">Subtotal</Text>
              <Text variant="bodyMedium">${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Tax (8.25%)
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                ${tax.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                Total
              </Text>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.primary }}>
                ${total.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onCheckout}
              loading={isSubmitting}
              disabled={isSubmitting}
              icon="cart-check"
              style={styles.actionButton}
            >
              Create Order
            </Button>
            {onPayNow && (
              <Button
                mode="contained"
                onPress={onPayNow}
                loading={isSubmitting}
                disabled={isSubmitting}
                icon="credit-card"
                buttonColor="#4caf50"
                style={styles.actionButton}
              >
                Pay Now
              </Button>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  itemsList: {
    flex: 1,
    maxHeight: 300,
  },
  itemCard: {
    marginBottom: 8,
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemTotal: {
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityText: {
    marginHorizontal: 4,
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '600',
  },
  divider: {
    marginVertical: 12,
  },
  totals: {
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actions: {
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
});

export default CartPanel;
