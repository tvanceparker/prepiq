// src/pages/pos/components/POSBasic.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import {
  Surface,
  Text,
  ActivityIndicator,
  Portal,
  Modal,
  Button,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import usePOS from '../../../hooks/usePOS';
import { useOrders } from '../../../hooks/useOrders';
import MenuItemGrid from './MenuItemGrid';
import CartPanel, { CartItem } from './CartPanel';
import OrderCard from './OrderCard';
import { MenuItemType } from '../../../interfaces/pos';
import { Order } from '../../../interfaces/orders';

const POSBasic: React.FC = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  // Queries
  const { menuItems, menuItemsLoading: menuLoading, createOrder, orderLoading } = usePOS();
  const { activeOrders, activeOrdersLoading: ordersLoading, updateOrderStatus } = useOrders({ autoRefresh: true });

  // Cart handlers
  const addToCart = useCallback((item: MenuItemType) => {
    setCart(prev => {
      const existing = prev.find(ci => ci.menu_item_id === item.menu_item_id);
      if (existing) {
        return prev.map(ci =>
          ci.menu_item_id === item.menu_item_id
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: 1,
          unit_price: item.price,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(ci => ci.menu_item_id !== menuItemId));
    } else {
      setCart(prev =>
        prev.map(ci =>
          ci.menu_item_id === menuItemId ? { ...ci, quantity } : ci
        )
      );
    }
  }, []);

  const removeFromCart = useCallback((menuItemId: number) => {
    setCart(prev => prev.filter(ci => ci.menu_item_id !== menuItemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Submit order using createOrder from usePOS
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const tax = subtotal * 0.0825;
    const total = subtotal + tax;

    try {
      await createOrder('cash');

      setSnackbar({ visible: true, message: 'Order created successfully!', type: 'success' });
      clearCart();
    } catch (error: any) {
      setSnackbar({
        visible: true,
        message: error.message || 'Failed to create order',
        type: 'error',
      });
    }
  };

  // Order status update
  const handleStatusUpdate = async (orderId: number, status: string) => {
    await updateOrderStatus({ orderId, status });
  };

  if (menuLoading && menuItems.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading POS...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="point-of-sale" size={28} color={theme.colors.primary} />
          <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
            POS Terminal
          </Text>
        </View>
        <Button
          mode="outlined"
          icon="clipboard-list"
          onPress={() => setShowOrdersModal(true)}
          compact
        >
          Orders ({activeOrders.length})
        </Button>
      </View>

      {isTablet ? (
        // Tablet: Side-by-side layout
        <View style={styles.tabletLayout}>
          {/* Menu Grid */}
          <Surface style={[styles.menuPanel, { flex: 2 }]} elevation={1}>
            <MenuItemGrid
              menuItems={menuItems}
              onAddItem={addToCart}
              loading={menuLoading}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          </Surface>

          {/* Cart Panel */}
          <Surface style={[styles.cartPanel, { flex: 1 }]} elevation={1}>
            <CartPanel
              items={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeFromCart}
              onClearCart={clearCart}
              onCheckout={handleCheckout}
              isSubmitting={orderLoading}
            />
          </Surface>
        </View>
      ) : (
        // Phone: Stacked layout
        <ScrollView style={styles.phoneLayout}>
          {/* Cart Summary at top if items exist */}
          {cart.length > 0 && (
            <Surface style={styles.phoneCartSummary} elevation={1}>
              <CartPanel
                items={cart}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
                onCheckout={handleCheckout}
                isSubmitting={orderLoading}
              />
            </Surface>
          )}

          {/* Menu Grid */}
          <Surface style={styles.phoneMenuPanel} elevation={1}>
            <MenuItemGrid
              menuItems={menuItems}
              onAddItem={addToCart}
              loading={menuLoading}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
            />
          </Surface>
        </ScrollView>
      )}

      {/* Orders Modal */}
      <Portal>
        <Modal
          visible={showOrdersModal}
          onDismiss={() => setShowOrdersModal(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              Active Orders
            </Text>
            <Button onPress={() => setShowOrdersModal(false)}>Close</Button>
          </View>

          {ordersLoading ? (
            <ActivityIndicator size="large" style={{ marginTop: 32 }} />
          ) : activeOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <MaterialCommunityIcons
                name="clipboard-text-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                No active orders
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.ordersList}>
              {activeOrders.map(order => (
                <OrderCard
                  key={order.order_id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  compact
                />
              ))}
            </ScrollView>
          )}
        </Modal>
      </Portal>

      {/* Snackbar */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(s => ({ ...s, visible: false }))}
        duration={3000}
        style={{ backgroundColor: snackbar.type === 'success' ? '#4caf50' : '#f44336' }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  menuPanel: {
    borderRadius: 12,
    padding: 16,
  },
  cartPanel: {
    borderRadius: 12,
    padding: 16,
    minWidth: 300,
  },
  phoneLayout: {
    flex: 1,
  },
  phoneCartSummary: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  phoneMenuPanel: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  modal: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  ordersList: {
    maxHeight: 400,
  },
});

export default POSBasic;
