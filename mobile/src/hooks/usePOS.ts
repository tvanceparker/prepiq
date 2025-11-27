// src/hooks/usePOS.ts
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMenuItems,
  createPOSOrder,
  sendOrderToKitchen,
  getPOSModeSettings,
  updatePOSModeSettings,
  cashDrawer,
  terminal,
  getDevices,
  registerDevice as apiRegisterDevice,
} from '../api/pos';
import type {
  MenuItemType,
  CartItem,
  POSModeSettings,
  POSModeUpdateRequest,
  CashDrawerOpenRequest,
  CashDrawerCloseRequest,
  TerminalPaymentRequest,
  POSDevice,
  DeviceRegistrationRequest,
} from '../interfaces/pos';

export interface UsePOSReturn {
  // Menu
  menuItems: MenuItemType[];
  menuItemsLoading: boolean;
  menuItemsByCategory: Record<string, MenuItemType[]>;

  // Cart
  cart: CartItem[];
  addToCart: (item: MenuItemType) => void;
  removeFromCart: (menuItemId: number) => void;
  updateCartItemQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartItemCount: number;

  // Orders
  createOrder: (paymentMethod: 'cash' | 'card') => Promise<any>;
  sendToKitchen: () => Promise<any>;
  orderLoading: boolean;

  // POS Settings
  posSettings: POSModeSettings | null;
  posSettingsLoading: boolean;
  updatePOSSettings: (settings: POSModeUpdateRequest) => Promise<POSModeSettings>;

  // Cash Drawer
  openDrawer: (request: CashDrawerOpenRequest) => Promise<any>;
  closeDrawer: (request: CashDrawerCloseRequest) => Promise<any>;
  currentDrawerSession: any;
  drawerSessionLoading: boolean;

  // Terminal
  terminalReaders: any[];
  terminalReadersLoading: boolean;
  processTerminalPayment: (request: TerminalPaymentRequest) => Promise<any>;

  // Devices
  devices: POSDevice[];
  isLoadingDevices: boolean;
  registerDevice: (request: Partial<DeviceRegistrationRequest>) => Promise<any>;
  isRegisteringDevice: boolean;
  unregisterDevice: (deviceId: number) => Promise<void>;
}

export function usePOS(): UsePOSReturn {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Fetch menu items
  const menuItemsQuery = useQuery({
    queryKey: ['pos', 'menu'],
    queryFn: fetchMenuItems,
    staleTime: 5 * 60 * 1000,
  });

  // Group menu items by category
  const menuItemsByCategory = (menuItemsQuery.data ?? []).reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItemType[]>);

  // Fetch POS settings
  const posSettingsQuery = useQuery({
    queryKey: ['pos', 'settings'],
    queryFn: getPOSModeSettings,
  });

  // Fetch devices
  const devicesQuery = useQuery({
    queryKey: ['pos', 'devices'],
    queryFn: getDevices,
  });

  // Register device mutation
  const registerDeviceMutation = useMutation({
    mutationFn: async (request: Partial<DeviceRegistrationRequest>) => {
      return apiRegisterDevice({
        device_name: request.device_name || 'Unknown Device',
        device_type: request.device_type || 'mobile',
        fingerprint: {
          userAgent: 'React Native',
          screenResolution: '1080x1920',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: 'en',
          platform: 'mobile',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'devices'] });
    },
  });

  // Unregister device mutation (uses del from api)
  const unregisterDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      // Would need an API endpoint for this
      console.log('Unregister device:', deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'devices'] });
    },
  });

  // Fetch current drawer session
  const drawerSessionQuery = useQuery({
    queryKey: ['pos', 'drawer', 'current'],
    queryFn: () => cashDrawer.getCurrentSession(),
  });

  // Fetch terminal readers
  const terminalReadersQuery = useQuery({
    queryKey: ['pos', 'terminal', 'readers'],
    queryFn: () => terminal.getReaders(),
    enabled: posSettingsQuery.data?.pos_mode === 'internal',
  });

  // Cart operations
  const addToCart = useCallback((item: MenuItemType) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item_id === item.menu_item_id);
      if (existing) {
        return prev.map(i =>
          i.menu_item_id === item.menu_item_id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((menuItemId: number) => {
    setCart(prev => prev.filter(i => i.menu_item_id !== menuItemId));
  }, []);

  const updateCartItemQuantity = useCallback(
    (menuItemId: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(menuItemId);
        return;
      }
      setCart(prev => prev.map(i => (i.menu_item_id === menuItemId ? { ...i, quantity } : i)));
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Order mutations
  const createOrderMutation = useMutation({
    mutationFn: (order: any) => createPOSOrder(order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart();
    },
  });

  const sendToKitchenMutation = useMutation({
    mutationFn: (order: any) => sendOrderToKitchen(order),
  });

  const createOrder = async (paymentMethod: 'cash' | 'card') => {
    const subtotal = cartTotal;
    const tax = subtotal * 0.08; // 8% tax - can be configurable
    const total = subtotal + tax;

    const order = {
      items: cart.map(item => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.price,
        instructions: item.instructions,
      })),
      subtotal,
      tax,
      total,
      payment_method: paymentMethod,
      sales_channel: 'pos',
    };

    return createOrderMutation.mutateAsync(order);
  };

  const sendToKitchen = async () => {
    const order = {
      items: cart.map(item => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: item.quantity,
        instructions: item.instructions,
      })),
    };
    return sendToKitchenMutation.mutateAsync(order);
  };

  // Settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: POSModeUpdateRequest) => updatePOSModeSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'settings'] });
    },
  });

  // Cash drawer mutations
  const openDrawerMutation = useMutation({
    mutationFn: (request: CashDrawerOpenRequest) => cashDrawer.open(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'drawer'] });
    },
  });

  const closeDrawerMutation = useMutation({
    mutationFn: (request: CashDrawerCloseRequest) => cashDrawer.close(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos', 'drawer'] });
    },
  });

  // Terminal payment mutation
  const terminalPaymentMutation = useMutation({
    mutationFn: async (request: TerminalPaymentRequest) => {
      const payment = await terminal.createPayment(request);
      return terminal.processPayment({
        reader_id: request.reader_id as number,
        payment_intent_id: payment.payment_intent_id,
      });
    },
  });

  return {
    // Menu
    menuItems: menuItemsQuery.data ?? [],
    menuItemsLoading: menuItemsQuery.isLoading,
    menuItemsByCategory,

    // Cart
    cart,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart,
    cartTotal,
    cartItemCount,

    // Orders
    createOrder,
    sendToKitchen,
    orderLoading: createOrderMutation.isPending || sendToKitchenMutation.isPending,

    // POS Settings
    posSettings: posSettingsQuery.data ?? null,
    posSettingsLoading: posSettingsQuery.isLoading,
    updatePOSSettings: updateSettingsMutation.mutateAsync,

    // Cash Drawer
    openDrawer: openDrawerMutation.mutateAsync,
    closeDrawer: closeDrawerMutation.mutateAsync,
    currentDrawerSession: drawerSessionQuery.data,
    drawerSessionLoading: drawerSessionQuery.isLoading,

    // Terminal
    terminalReaders: terminalReadersQuery.data ?? [],
    terminalReadersLoading: terminalReadersQuery.isLoading,
    processTerminalPayment: terminalPaymentMutation.mutateAsync,

    // Devices
    devices: devicesQuery.data ?? [],
    isLoadingDevices: devicesQuery.isLoading,
    registerDevice: registerDeviceMutation.mutateAsync,
    isRegisteringDevice: registerDeviceMutation.isPending,
    unregisterDevice: unregisterDeviceMutation.mutateAsync,
  };
}

export default usePOS;
