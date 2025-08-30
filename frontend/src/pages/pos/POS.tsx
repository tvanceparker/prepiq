// src/pages/pos/POS.tsx
import React, { Fragment, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { Payment as PaymentIcon, ShoppingCart as CartIcon } from '@mui/icons-material';
import { usePOS } from './hooks/usePOS';
import { useOrders } from './hooks/useOrders';
import { useDevice } from '../../contexts/DeviceContext';
import OrderCard from './components/OrderCard';
import PaymentTerminal from './components/PaymentTerminal';
import MenuItemGrid from './components/MenuItemGrid';
import ModifierEditor from './components/ModifierEditor';
import { StatusUpdater, OrderItem, MenuItemType } from '../../interfaces/pos';

const KitchenDisplayMode: React.FC<{
  activeOrders: any[];
  loading: boolean;
  onStatusUpdate: StatusUpdater;
}> = ({ activeOrders, loading, onStatusUpdate }) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Kitchen Display - Order Tickets
    </Typography>
    {loading ? (
      <CircularProgress />
    ) : (
      <Grid container spacing={2}>
        {activeOrders.map((order: any) => (
          <Grid item xs={12} sm={6} md={4} key={order.order_id}>
            <OrderCard order={order} onStatusUpdate={onStatusUpdate} />
          </Grid>
        ))}
      </Grid>
    )}
  </Box>
);

const MobilePOSMode: React.FC<{
  currentOrder: OrderItem[];
  menuItems: MenuItemType[];
  loading: boolean;
  onAddItem: (item: MenuItemType) => void;
  onCreateOrder: () => void;
  calculateTotal: () => number;
  onEditModifiers: (menuItemId: number) => void;
}> = ({
  currentOrder,
  menuItems,
  loading,
  onAddItem,
  onCreateOrder,
  calculateTotal,
  onEditModifiers,
}) => (
  <Box>
    <Typography variant="h6" gutterBottom>
      Mobile POS Interface
    </Typography>
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <MenuItemGrid menuItems={menuItems as any} onAddItem={onAddItem as any} loading={loading} />
      </Grid>
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Current Order
          </Typography>
          {currentOrder.map((item: OrderItem) => (
            <Card key={item.menu_item_id} sx={{ mb: 1 }}>
              <CardContent sx={{ py: 1 }}>
                <Typography variant="body2">
                  {(menuItems as any).find((m: any) => m.menu_item_id === item.menu_item_id)?.name}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    ${item.unit_price.toFixed(2)} × {item.quantity}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={() => onEditModifiers(item.menu_item_id)}>
                    Edit Modifiers
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {item.modifiers?.length ? `${item.modifiers.length} modifiers` : 'No modifiers'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
          {currentOrder.length > 0 && (
            <Box mt={2}>
              <Typography variant="h6" align="right">
                Total: ${calculateTotal().toFixed(2)}
              </Typography>
              <Button variant="contained" fullWidth onClick={onCreateOrder} sx={{ mt: 1 }}>
                Create Order
              </Button>
            </Box>
          )}
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const DesktopPOSMode: React.FC<{
  currentOrder: OrderItem[];
  menuItems: MenuItemType[];
  activeOrders: any[];
  loading: boolean;
  onAddItem: (item: MenuItemType) => void;
  onRemoveItem: (id: number) => void;
  onUpdateQuantity: (id: number, qty: number) => void;
  onCreateOrder: () => void;
  onClearOrder: () => void;
  onPayment: () => void;
  onStatusUpdate: StatusUpdater;
  calculateTotal: () => number;
  onEditModifiers: (menuItemId: number) => void;
}> = ({
  currentOrder,
  menuItems,
  activeOrders,
  loading,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
  onCreateOrder,
  onClearOrder,
  onPayment,
  onStatusUpdate,
  calculateTotal,
  onEditModifiers,
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={8}>
      <Paper sx={{ p: 2, height: '70vh', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Menu Items
        </Typography>
        <MenuItemGrid menuItems={menuItems as any} onAddItem={onAddItem as any} loading={loading} />
      </Paper>
    </Grid>
    <Grid item xs={12} md={4}>
      <Paper sx={{ p: 2, height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" gutterBottom>
          Current Order
        </Typography>
        <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
          {currentOrder.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
              No items in order
            </Typography>
          ) : (
            currentOrder.map((item: OrderItem) => (
              <Card key={item.menu_item_id} sx={{ mb: 1 }}>
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="body2">
                    {
                      (menuItems as any).find((m: any) => m.menu_item_id === item.menu_item_id)
                        ?.name
                    }
                  </Typography>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      ${item.unit_price.toFixed(2)} × {item.quantity}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      ${(item.unit_price * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ py: 0, px: 1 }}>
                  <Button
                    size="small"
                    onClick={() => onUpdateQuantity(item.menu_item_id, item.quantity - 1)}
                  >
                    -
                  </Button>
                  <Chip label={item.quantity} size="small" />
                  <Button
                    size="small"
                    onClick={() => onUpdateQuantity(item.menu_item_id, item.quantity + 1)}
                  >
                    +
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onRemoveItem(item.menu_item_id)}
                  >
                    Remove
                  </Button>
                  <Button size="small" onClick={() => onEditModifiers(item.menu_item_id)}>
                    Edit Modifiers
                  </Button>
                </CardActions>
              </Card>
            ))
          )}
        </Box>
        {currentOrder.length > 0 && (
          <Box>
            <Typography variant="h6" align="right">
              Total: ${calculateTotal().toFixed(2)}
            </Typography>
            <Box display="flex" gap={1} sx={{ mt: 1 }}>
              <Button variant="outlined" fullWidth onClick={onClearOrder}>
                Clear
              </Button>
              <Button
                variant="contained"
                fullWidth
                startIcon={<CartIcon />}
                onClick={onCreateOrder}
              >
                Create Order
              </Button>
            </Box>
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<PaymentIcon />}
              onClick={onPayment}
              sx={{ mt: 1 }}
            >
              Pay Now
            </Button>
          </Box>
        )}
      </Paper>
    </Grid>
    <Grid item xs={12}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Active Orders ({(activeOrders || []).length})
        </Typography>
        <Grid container spacing={2}>
          {(activeOrders || []).map((order: any) => (
            <Grid item xs={12} sm={6} md={4} key={order.order_id}>
              <OrderCard order={order} onStatusUpdate={onStatusUpdate} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Grid>
  </Grid>
);

const POS: React.FC = () => {
  const { device, isLoading: posLoading } = usePOS();
  const {
    activeOrders,
    menuItems,
    isLoading: ordersLoading,
    createOrder,
    updateOrderStatus,
    refreshOrders,
  } = useOrders();
  const { device: deviceInfo } = useDevice();

  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  // removed unused menuQuery/search - category filter will be used instead
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingModifiersFor, setEditingModifiersFor] = useState<number | null>(null);
  const [modifierEditorOpen, setModifierEditorOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // registration modal controlled globally via RegistrationModalContext

  const addItemToOrder = (menuItem: MenuItemType) => {
    const existing = currentOrder.find(i => i.menu_item_id === menuItem.menu_item_id);
    if (existing) {
      setCurrentOrder(
        currentOrder.map(i =>
          i.menu_item_id === menuItem.menu_item_id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCurrentOrder([
        ...currentOrder,
        {
          menu_item_id: menuItem.menu_item_id,
          quantity: 1,
          unit_price: menuItem.price,
          instructions: '',
          modifiers: [],
        },
      ]);
    }
  };

  const removeItemFromOrder = (menuItemId: number) =>
    setCurrentOrder(currentOrder.filter(i => i.menu_item_id !== menuItemId));

  const updateItemQuantity = (menuItemId: number, qty: number) => {
    if (qty <= 0) return removeItemFromOrder(menuItemId);
    setCurrentOrder(
      currentOrder.map(i => (i.menu_item_id === menuItemId ? { ...i, quantity: qty } : i))
    );
  };

  const calculateTotal = () => currentOrder.reduce((t, i) => t + i.unit_price * i.quantity, 0);

  const handleCreateOrder = async () => {
    if (currentOrder.length === 0) return;
    try {
      const subtotal = calculateTotal();
      const tax = subtotal * 0.08;
      const total = subtotal + tax;
      // Map local OrderItem -> API OrderItemCreate shape
      const apiItems = currentOrder.map(i => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        instructions: i.instructions || undefined,
        modifiers: (i.modifiers || []).map((m: any) => ({
          mod_type: m.mod_type || 'custom',
          reference_id: m.reference_id,
          quantity: m.quantity || 1,
          note: m.note || null,
        })),
      }));

      await createOrder({
        sales_channel: 'in_person',
        items: apiItems,
        subtotal,
        tax,
        discount: 0,
        total,
      });
      setCurrentOrder([]);
      refreshOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    }
  };

  if (posLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Do not block the POS UI if device is not registered; users can register via the sidebar CTA.

  return (
    <Fragment>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Point of Sale - {device?.device_name} ({deviceInfo.type})
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Category filter chips */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`All (${(menuItems || []).length})`}
            clickable
            color={categoryFilter === 'all' ? 'primary' : 'default'}
            onClick={() => setCategoryFilter('all')}
          />
          {Array.from(new Set((menuItems || []).map(m => m.category).filter(Boolean))).map(
            (cat: any) => (
              <Chip
                key={cat}
                label={`${cat} (${(menuItems || []).filter(m => m.category === cat).length})`}
                clickable
                color={categoryFilter === cat ? 'primary' : 'default'}
                onClick={() => setCategoryFilter(cat)}
              />
            )
          )}
        </Box>

        {deviceInfo.type === 'kitchen_display' ? (
          <KitchenDisplayMode
            activeOrders={activeOrders as any}
            loading={ordersLoading}
            onStatusUpdate={updateOrderStatus as StatusUpdater}
          />
        ) : deviceInfo.type === 'mobile' ? (
          <MobilePOSMode
            currentOrder={currentOrder}
            menuItems={
              (menuItems || []).filter(m =>
                categoryFilter === 'all' ? true : (m.category || '') === categoryFilter
              ) as any
            }
            loading={ordersLoading}
            onAddItem={addItemToOrder}
            onCreateOrder={handleCreateOrder}
            calculateTotal={calculateTotal}
            onEditModifiers={(menuItemId: number) => {
              setEditingModifiersFor(menuItemId);
              setModifierEditorOpen(true);
            }}
          />
        ) : (
          <DesktopPOSMode
            currentOrder={currentOrder}
            menuItems={
              (menuItems || []).filter(m =>
                categoryFilter === 'all' ? true : (m.category || '') === categoryFilter
              ) as any
            }
            activeOrders={activeOrders as any}
            loading={ordersLoading}
            onAddItem={addItemToOrder}
            onRemoveItem={removeItemFromOrder}
            onUpdateQuantity={updateItemQuantity}
            onCreateOrder={handleCreateOrder}
            onClearOrder={() => setCurrentOrder([])}
            onPayment={() => setShowPayment(true)}
            onStatusUpdate={updateOrderStatus as StatusUpdater}
            calculateTotal={calculateTotal}
            onEditModifiers={(menuItemId: number) => {
              setEditingModifiersFor(menuItemId);
              setModifierEditorOpen(true);
            }}
          />
        )}
      </Box>

      <PaymentTerminal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        amount={calculateTotal()}
        onPaymentComplete={() => {
          setShowPayment(false);
          setCurrentOrder([]);
        }}
      />
      <ModifierEditor
        open={modifierEditorOpen}
        onClose={() => setModifierEditorOpen(false)}
        initial={
          editingModifiersFor
            ? currentOrder.find(i => i.menu_item_id === editingModifiersFor)?.modifiers || []
            : []
        }
        onSave={mods => {
          if (!editingModifiersFor) return;
          setCurrentOrder(prev =>
            prev.map(i => (i.menu_item_id === editingModifiersFor ? { ...i, modifiers: mods } : i))
          );
          setEditingModifiersFor(null);
        }}
      />
    </Fragment>
  );
};

export default POS;
