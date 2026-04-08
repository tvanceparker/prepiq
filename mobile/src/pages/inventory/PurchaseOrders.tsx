// src/pages/inventory/PurchaseOrders.tsx
import React, { useState, useCallback, useContext, useMemo } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, ScrollView } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Card,
  Button,
  Chip,
  TextInput,
  ActivityIndicator,
  Portal,
  Modal,
  List,
  Divider,
  IconButton,
  FAB,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  usePurchaseOrders,
  usePOSuggestions,
  useIngredientStockLevels,
  useIngredientSuppliers,
} from '../../hooks/usePurchaseOrders';
import { AuthContext } from '../../contexts/AuthContext';
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderItem,
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../../interfaces/inventory';
import {
  POMethodSelector,
  POSupplierConfig,
  POIngredientBrowser,
  POSupplierReview,
  POIngredientReview,
  IngredientCartItem,
  WizardMode,
} from './components/po-wizard';

interface POSection {
  title: string;
  status: PurchaseOrderStatus;
  data: PurchaseOrder[];
}

type WizardStep = 0 | 1;
const WIZARD_STEPS = ['Method', 'Build'];
type ReceiptDraft = {
  orderId: number;
  deliveryDate: string;
  items: Array<{
    order_item_id: number;
    ingredient_name: string;
    quantity_ordered: number;
    quantity_received: string;
    unit: string;
  }>;
};

const getForecastSourceLabel = (forecastSourceType: 'eod' | 'on_demand') =>
  forecastSourceType === 'eod' ? 'EOD' : 'On-demand';

const getSupplierGroupKey = (supplierId?: number | null) =>
  supplierId === null || supplierId === undefined ? 'unspecified' : String(supplierId);

const getSupplierLabel = (supplierName?: string | null, supplierId?: number | null): string => {
  if (supplierName) {
    return supplierName;
  }
  if (supplierId === null || supplierId === undefined) {
    return 'Unspecified supplier';
  }
  return `Supplier ${supplierId}`;
};

const getForecastStatusTone = (status: 'ready' | 'stale' | 'degraded' | 'failed') => {
  switch (status) {
    case 'ready':
      return '#2e7d32';
    case 'stale':
      return '#ed6c02';
    case 'degraded':
      return '#d9822b';
    case 'failed':
      return '#d32f2f';
    default:
      return '#6b7280';
  }
};

const formatExplanationValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'n/a';
  }
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(2);
};

const formatSelectionRule = (rule?: string | null): string => {
  if (rule === 'preferred_lowest_priority') {
    return 'preferred supplier rule';
  }
  if (rule === 'fallback_lowest_priority') {
    return 'fallback to lowest supplier priority';
  }
  return rule || 'supplier rule';
};

const getOrderSourceLabel = (sourceType?: 'manual' | 'suggestion' | 'eod_auto' | null): string => {
  if (sourceType === 'eod_auto') {
    return 'EOD draft';
  }
  if (sourceType === 'suggestion') {
    return 'Reorder draft';
  }
  return 'Manual order';
};

const getReviewItemWarnings = (
  flags?: {
    lead_time_source: string;
    moq_source: string;
    shelf_life_source: string;
    inventory_source: string;
    unit_conversion_fallback: boolean;
    pricing_missing: boolean;
    abc_defaulted: boolean;
  } | null
): string[] => {
  if (!flags) {
    return [];
  }

  const warnings: string[] = [];
  if (flags.lead_time_source !== 'supplier') warnings.push('lead time fallback');
  if (flags.moq_source !== 'supplier') warnings.push('MOQ fallback');
  if (flags.shelf_life_source === 'missing_assumed_zero') warnings.push('shelf life assumed 0');
  if (flags.inventory_source !== 'inventory_summary') warnings.push('inventory fallback');
  if (flags.unit_conversion_fallback) warnings.push('unit conversion fallback');
  if (flags.pricing_missing) warnings.push('pricing missing');
  if (flags.abc_defaulted) warnings.push('ABC defaulted to C');
  return warnings;
};

export default function PurchaseOrders(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [receiptDraft, setReceiptDraft] = useState<ReceiptDraft | null>(null);

  // Unified Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [wizardMode, setWizardMode] = useState<WizardMode | null>(null);

  // Supplier mode state
  const [useCachedForecast, setUseCachedForecast] = useState(true);
  const [horizonDays, setHorizonDays] = useState(7);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());

  // Ingredient mode state
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientStockLevel | null>(null);
  const [ingredientSupplier, setIngredientSupplier] = useState<IngredientSupplierOption | null>(
    null
  );
  const [ingredientQty, setIngredientQty] = useState(1);
  const [cartItems, setCartItems] = useState<IngredientCartItem[]>([]);

  // Notes
  const [orderNotes, setOrderNotes] = useState('');

  // Inline item editing
  const [editingItem, setEditingItem] = useState<PurchaseOrderItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Queries & hooks
  const {
    orders: purchaseOrders,
    loading: isLoading,
    refresh,
    updateStatus,
    updatingStatus,
    receiveOrder,
    receivingOrder,
    formatReceiptSummary,
    createOrder,
    updateItem,
    updatingItem,
    removeItem,
    removingItem,
  } = usePurchaseOrders({
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const {
    lastEodDate,
    generateSuggestions,
    generating,
    suggestions,
    createFromSuggestions,
    creating,
    reset: resetSuggestions,
  } = usePOSuggestions();

  const { stockLevels, loading: stockLoading } = useIngredientStockLevels(
    wizardOpen && wizardMode === 'ingredient'
  );

  const { suppliers: ingredientSuppliers, loading: suppliersLoading } = useIngredientSuppliers(
    selectedIngredient?.ingredient_id ?? null
  );

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const showToast = (message: string) => setSnackbar({ open: true, message });

  // Filter POs
  const filteredPOs = useMemo(() => {
    if (!searchQuery) return purchaseOrders;
    const query = searchQuery.toLowerCase();
    return purchaseOrders.filter(
      po =>
        po.order_id?.toString().includes(query) || po.supplier_name?.toLowerCase().includes(query)
    );
  }, [purchaseOrders, searchQuery]);

  // Group by status
  const sections: POSection[] = useMemo(() => {
    const statusOrder: PurchaseOrderStatus[] = ['cart', 'pending', 'delivered', 'cancelled'];
    const grouped: Record<string, PurchaseOrder[]> = {};

    filteredPOs.forEach(po => {
      const status = po.status || 'pending';
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(po);
    });

    return statusOrder
      .filter(status => grouped[status]?.length > 0)
      .map(status => ({
        title: status.charAt(0).toUpperCase() + status.slice(1),
        status,
        data: grouped[status],
      }));
  }, [filteredPOs]);

  // Keep selected PO in sync with latest query data
  React.useEffect(() => {
    if (!selectedPO) return;
    const next = purchaseOrders.find(po => po.order_id === selectedPO.order_id);
    if (next && next !== selectedPO) {
      setSelectedPO(next);
    }
  }, [purchaseOrders, selectedPO]);

  React.useEffect(() => {
    if (!selectedPO && editingItem) {
      closeItemEditor();
    }
  }, [selectedPO, editingItem]);

  // Status color helper
  const getStatusColor = (status: PurchaseOrderStatus): string => {
    switch (status) {
      case 'cart':
        return '#9e9e9e';
      case 'pending':
        return '#ff9800';
      case 'delivered':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  // Handle status update
  const handleStatusUpdate = async (poId: number, newStatus: PurchaseOrderStatus) => {
    const result = await updateStatus({ orderId: poId, status: newStatus });
    if (result && typeof result === 'object' && 'receipt_mode' in result) {
      showToast(formatReceiptSummary(result));
    } else if (
      result &&
      typeof result === 'object' &&
      'expected_delivery_refreshed' in result &&
      result.expected_delivery_refreshed &&
      result.expected_delivery_date
    ) {
      showToast(
        `Order submitted. Expected delivery refreshed to ${new Date(result.expected_delivery_date).toLocaleDateString()}.`
      );
    } else {
      showToast('Order status updated.');
    }
    setSelectedPO(null);
  };

  const openReceiptModal = (order: PurchaseOrder) => {
    setReceiptDraft({
      orderId: order.order_id,
      deliveryDate: order.expected_delivery_date
        ? new Date(order.expected_delivery_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      items: order.items.map(item => ({
        order_item_id: item.order_item_id,
        ingredient_name: item.ingredient_name,
        quantity_ordered: item.quantity_ordered,
        quantity_received:
          item.quantity_received !== null && item.quantity_received !== undefined
            ? String(item.quantity_received)
            : String(item.quantity_ordered),
        unit: item.unit,
      })),
    });
  };

  const closeReceiptModal = () => {
    setReceiptDraft(null);
  };

  const updateReceiptDraftItem = (orderItemId: number, value: string) => {
    setReceiptDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item =>
          item.order_item_id === orderItemId ? { ...item, quantity_received: value } : item
        ),
      };
    });
  };

  const resetReceiptDraftToOrdered = () => {
    setReceiptDraft(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(item => ({
          ...item,
          quantity_received: String(item.quantity_ordered),
        })),
      };
    });
  };

  const handleReceiveOrder = async () => {
    if (!receiptDraft) return;

    const received_items = receiptDraft.items.map(item => ({
      order_item_id: item.order_item_id,
      quantity_received: Number(item.quantity_received),
    }));

    if (
      received_items.some(
        item => Number.isNaN(item.quantity_received) || item.quantity_received <= 0
      )
    ) {
      showToast('Enter a valid received quantity for every line.');
      return;
    }

    try {
      const result = await receiveOrder({
        orderId: receiptDraft.orderId,
        payload: {
          actual_delivery_date: receiptDraft.deliveryDate || undefined,
          received_items,
        },
      });
      showToast(formatReceiptSummary(result));
      setSelectedPO(null);
      closeReceiptModal();
    } catch (error) {
      console.error('Failed to receive order', error);
      showToast('Failed to receive order.');
    }
  };

  const openItemEditor = (item: PurchaseOrderItem) => {
    if (!selectedPO || selectedPO.status !== 'cart') return;
    setEditingItem(item);
    setEditQty(item.quantity_ordered.toString());
  };

  const closeItemEditor = () => {
    setEditingItem(null);
    setEditQty('');
  };

  const handleSaveItemEdit = async () => {
    if (!selectedPO || !editingItem) return;
    const qtyNum = Number(editQty);
    if (Number.isNaN(qtyNum) || qtyNum <= 0) {
      return;
    }
    try {
      const result = await updateItem({
        orderId: selectedPO.order_id,
        orderItemId: editingItem.order_item_id,
        updates: {
          quantity_ordered: qtyNum,
        },
      });

      // Optimistic local update for the open modal
      setSelectedPO(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(it =>
            it.order_item_id === editingItem.order_item_id
              ? {
                  ...it,
                  quantity_ordered: qtyNum,
                  total_item_price: qtyNum * it.unit_price,
                }
              : it
          ),
          total_order_price:
            result && typeof result === 'object' && 'order_total_price' in result
              ? result.order_total_price
              : prev.total_order_price,
        };
      });

      closeItemEditor();
    } catch (err) {
      console.error('Failed to update item', err);
    }
  };

  const handleNudgeDraftItemQty = async (item: PurchaseOrderItem, delta: number) => {
    if (!selectedPO) return;
    const nextQty = Math.max(1, Number(item.quantity_ordered) + delta);

    try {
      const result = await updateItem({
        orderId: selectedPO.order_id,
        orderItemId: item.order_item_id,
        updates: {
          quantity_ordered: nextQty,
        },
      });

      setSelectedPO(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(it =>
            it.order_item_id === item.order_item_id
              ? {
                  ...it,
                  quantity_ordered: nextQty,
                  total_item_price: nextQty * it.unit_price,
                }
              : it
          ),
          total_order_price:
            result && typeof result === 'object' && 'order_total_price' in result
              ? result.order_total_price
              : prev.total_order_price,
        };
      });
    } catch (err) {
      console.error('Failed to update item quantity', err);
    }
  };

  const handleRemoveDraftItem = async (item: PurchaseOrderItem) => {
    if (!selectedPO) return;

    try {
      const result = await removeItem({
        orderId: selectedPO.order_id,
        orderItemId: item.order_item_id,
      });

      setSelectedPO(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter(it => it.order_item_id !== item.order_item_id),
          total_order_price:
            result && typeof result === 'object' && 'order_total_price' in result
              ? result.order_total_price
              : prev.total_order_price,
        };
      });
    } catch (err) {
      console.error('Failed to remove draft item', err);
    }
  };

  // Wizard helpers
  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardStep(0);
    setWizardMode(null);
    resetSuggestions();
    setSelectedItems(new Map());
    setSelectedIngredient(null);
    setIngredientSupplier(null);
    setIngredientQty(1);
    setCartItems([]);
    setOrderNotes('');
  }, [resetSuggestions]);

  const openWizard = useCallback(() => {
    setWizardOpen(true);
    setWizardStep(0);
    setWizardMode(null);
  }, []);

  const openSupplierPreviewWizard = useCallback(() => {
    setWizardOpen(true);
    setWizardStep(1);
    setWizardMode('supplier');
  }, []);

  const openReorderPreviewWorkspace = useCallback(() => {
    setUseCachedForecast(true);
    resetSuggestions();
    setSelectedItems(new Map());
    setExpandedSuppliers(new Set());
    openSupplierPreviewWizard();
  }, [openSupplierPreviewWizard, resetSuggestions]);

  const handleRunFreshReorderPreview = useCallback(async () => {
    setUseCachedForecast(false);
    resetSuggestions();
    setSelectedItems(new Map());
    setExpandedSuppliers(new Set());
    openSupplierPreviewWizard();

    try {
      const result = await generateSuggestions({ horizonDays, useCachedForecast: false });
      const allItems = new Map<string, number>();
      result.all_items.forEach(item => {
        allItems.set(
          `${getSupplierGroupKey(item.supplier_id)}-${item.ingredient_id}`,
          item.quantity_to_order
        );
      });
      setSelectedItems(allItems);
      const supplierIds = new Set(result.suggestions.map(s => getSupplierGroupKey(s.supplier_id)));
      setExpandedSuppliers(supplierIds);
      showToast(
        result.forecast_status_message ||
          `Generated ${result.all_items.length} suggestion${result.all_items.length === 1 ? '' : 's'} using the ${getForecastSourceLabel(result.forecast_source_type)} forecast.`
      );
    } catch (error) {
      console.error('Failed to generate fresh preview suggestions:', error);
    }
  }, [generateSuggestions, horizonDays, openSupplierPreviewWizard, resetSuggestions]);

  // Generate suggestions
  const handleGenerateSuggestions = async () => {
    try {
      const result = await generateSuggestions({ horizonDays, useCachedForecast });
      const allItems = new Map<string, number>();
      result.all_items.forEach(item => {
        allItems.set(
          `${getSupplierGroupKey(item.supplier_id)}-${item.ingredient_id}`,
          item.quantity_to_order
        );
      });
      setSelectedItems(allItems);
      const supplierIds = new Set(result.suggestions.map(s => getSupplierGroupKey(s.supplier_id)));
      setExpandedSuppliers(supplierIds);
      showToast(
        result.forecast_status_message ||
          `Generated ${result.all_items.length} suggestion${result.all_items.length === 1 ? '' : 's'} using the ${getForecastSourceLabel(result.forecast_source_type)} forecast.`
      );
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    }
  };

  // Create POs from selected suggestions
  const handleCreateFromSuggestions = async () => {
    if (!suggestions) return;
    const selectedItemsList: any[] = [];
    suggestions.all_items.forEach(item => {
      const key = `${getSupplierGroupKey(item.supplier_id)}-${item.ingredient_id}`;
      if (selectedItems.has(key)) {
        selectedItemsList.push({
          ...item,
          quantity_to_order: selectedItems.get(key) || item.quantity_to_order,
        });
      }
    });

    try {
      await createFromSuggestions({
        suggestions: selectedItemsList,
        notes: orderNotes || undefined,
      });
      closeWizard();
      setStatusFilter('cart');
    } catch (error) {
      console.error('Failed to create orders:', error);
    }
  };

  const wizardDescriptor =
    wizardStep === 0
      ? 'Choose how you want to build the draft, then move into a focused order workspace.'
      : wizardMode === 'supplier'
        ? 'Review forecast-driven lines while the live draft stays visible before you save it.'
        : 'Assemble a supplier-grouped draft with ingredient-level control before you save it.';

  // Create ingredient order
  const handleAddToCart = (item: IngredientCartItem) => {
    setCartItems(prev => {
      const idx = prev.findIndex(
        existing =>
          existing.ingredient.ingredient_id === item.ingredient.ingredient_id &&
          existing.supplier.supplier_id === item.supplier.supplier_id
      );
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], qtyPacks: next[idx].qtyPacks + item.qtyPacks };
        return next;
      }
      return [...prev, item];
    });
  };

  const handleUpdateCartItemQty = (ingredientId: number, supplierId: number, qtyPacks: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.ingredient.ingredient_id === ingredientId && item.supplier.supplier_id === supplierId
          ? { ...item, qtyPacks }
          : item
      )
    );
  };

  const handleRemoveCartItem = (ingredientId: number, supplierId: number) => {
    setCartItems(prev =>
      prev.filter(
        item =>
          !(
            item.ingredient.ingredient_id === ingredientId &&
            item.supplier.supplier_id === supplierId
          )
      )
    );
  };

  const handleCreateIngredientOrders = async () => {
    if (cartItems.length === 0) return;
    const grouped = new Map<number, IngredientCartItem[]>();
    cartItems.forEach(item => {
      const list = grouped.get(item.supplier.supplier_id) || [];
      list.push(item);
      grouped.set(item.supplier.supplier_id, list);
    });

    try {
      for (const [supplierId, items] of grouped.entries()) {
        const first = items[0];
        await createOrder({
          supplier_id: supplierId,
          expected_delivery_date: new Date(
            Date.now() + first.supplier.lead_time_days * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split('T')[0],
          items: items.map(item => ({
            ingredient_id: item.ingredient.ingredient_id,
            quantity_ordered: item.qtyPacks * item.supplier.pack_size,
            unit: item.supplier.pack_unit,
            unit_price: item.supplier.unit_price,
          })),
          notes: orderNotes || undefined,
        });
      }
      closeWizard();
      setStatusFilter('cart');
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  // Calculate totals for review
  const reviewTotals = useMemo(() => {
    if (!suggestions) return { itemCount: 0, total: 0, supplierCount: 0 };
    let total = 0;
    let itemCount = 0;
    const supplierSet = new Set<string>();

    suggestions.all_items.forEach(item => {
      const key = `${getSupplierGroupKey(item.supplier_id)}-${item.ingredient_id}`;
      if (selectedItems.has(key)) {
        const qty = selectedItems.get(key) || item.quantity_to_order;
        total += qty * item.unit_price;
        itemCount++;
        supplierSet.add(getSupplierGroupKey(item.supplier_id));
      }
    });

    return { itemCount, total, supplierCount: supplierSet.size };
  }, [suggestions, selectedItems]);

  const ingredientReviewTotals = useMemo(() => {
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

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: purchaseOrders.length };
    purchaseOrders.forEach(po => {
      const status = po.status || 'pending';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [purchaseOrders]);

  // Navigation helpers
  const canProceed = () => {
    if (wizardStep === 0) return wizardMode !== null;
    if (wizardStep === 1) {
      if (wizardMode === 'supplier') return selectedItems.size > 0;
      if (wizardMode === 'ingredient') return cartItems.length > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (wizardStep === 0) {
      setWizardStep(1);
    }
  };

  const handleBack = () => {
    if (wizardStep === 1) {
      setWizardStep(0);
      resetSuggestions();
    }
  };

  const handleCreate = () => {
    if (wizardMode === 'supplier') {
      handleCreateFromSuggestions();
    } else {
      handleCreateIngredientOrders();
    }
  };

  // Render section header
  const renderSectionHeader = ({ section }: { section: POSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(section.status) }]} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip} textStyle={styles.countChipText}>
        {section.data.length}
      </Chip>
    </View>
  );

  // Render PO item
  const renderItem = ({ item }: { item: PurchaseOrder }) => (
    <Card style={styles.card} mode="outlined" onPress={() => setSelectedPO(item)}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="titleMedium" style={styles.poNumber}>
              {`PO #${item.order_id}`}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {getSupplierLabel(item.supplier_name, item.supplier_id)}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) }]}
            textStyle={styles.statusText}
          >
            {item.status?.toUpperCase()}
          </Chip>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons
              name="package-variant"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.items?.length || 0} items
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons
              name="currency-usd"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.detailText}>
              ${item.total_order_price?.toFixed(2) || '0.00'}
            </Text>
          </View>
          {item.expected_delivery_date && (
            <View style={styles.detailItem}>
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {new Date(item.expected_delivery_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  // Wizard content router
  const renderWizardContent = () => {
    if (wizardStep === 0) {
      return <POMethodSelector selectedMode={wizardMode} onSelectMode={setWizardMode} />;
    }

    if (wizardMode === 'supplier') {
      return (
        <View>
          <POSupplierConfig
            useCachedForecast={useCachedForecast}
            setUseCachedForecast={setUseCachedForecast}
            horizonDays={horizonDays}
            setHorizonDays={setHorizonDays}
            lastEodDate={lastEodDate ?? undefined}
            onGenerate={handleGenerateSuggestions}
            onGenerateFresh={handleRunFreshReorderPreview}
            isGenerating={generating}
          />
          {suggestions ? (
            <POSupplierReview
              suggestions={suggestions}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              expandedSuppliers={expandedSuppliers}
              setExpandedSuppliers={setExpandedSuppliers}
              orderNotes={orderNotes}
              setOrderNotes={setOrderNotes}
            />
          ) : (
            <Card style={styles.builderPlaceholderCard} mode="outlined">
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 6 }}>
                  Suggestions will appear here
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Generate supplier recommendations, then refine quantities and notes before
                  creating draft purchase orders.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      );
    }

    if (wizardMode === 'ingredient') {
      return (
        <View>
          <POIngredientBrowser
            stockLevels={stockLevels}
            stockLoading={stockLoading}
            selectedIngredient={selectedIngredient}
            setSelectedIngredient={setSelectedIngredient}
            ingredientSuppliers={ingredientSuppliers}
            suppliersLoading={suppliersLoading}
            ingredientSupplier={ingredientSupplier}
            setIngredientSupplier={setIngredientSupplier}
            ingredientQty={ingredientQty}
            setIngredientQty={setIngredientQty}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateCartItemQty={handleUpdateCartItemQty}
            onRemoveCartItem={handleRemoveCartItem}
          />
          {cartItems.length > 0 ? (
            <POIngredientReview
              cartItems={cartItems}
              onUpdateCartItemQty={handleUpdateCartItemQty}
              onRemoveCartItem={handleRemoveCartItem}
              orderNotes={orderNotes}
              setOrderNotes={setOrderNotes}
            />
          ) : (
            <Card style={styles.builderPlaceholderCard} mode="outlined">
              <Card.Content>
                <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 6 }}>
                  Current draft will appear here
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Pick an ingredient, choose a supplier, and add quantities. The draft stays below
                  while you build the order.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>
      );
    }

    return null;
  };

  // Loading state
  if (isLoading && purchaseOrders.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background, flex: 1 }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading purchase orders...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="clipboard-list" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Purchase Orders
            </Text>
          </View>
        </View>

        <Searchbar
          placeholder="Search POs..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        <Button
          mode="contained-tonal"
          icon="play"
          onPress={handleRunFreshReorderPreview}
          loading={generating}
          disabled={generating}
          style={styles.previewAction}
        >
          Run Reorder Preview
        </Button>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={styles.filterRow}>
            {(['all', 'cart', 'pending', 'delivered'] as const).map(s => (
              <Chip
                key={s}
                selected={statusFilter === s}
                onPress={() => setStatusFilter(s as PurchaseOrderStatus | 'all')}
                style={styles.filterChip}
                showSelectedCheck={false}
                mode={statusFilter === s ? 'flat' : 'outlined'}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)} (
                {statusCounts[s] || 0})
              </Chip>
            ))}
          </View>
        </ScrollView>
      </Surface>

      {/* PO List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="clipboard-text-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No purchase orders found
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            Tap the button below to create one
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.order_id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
        />
      )}

      {/* FAB */}
      <FAB
        icon={() => <MaterialCommunityIcons name="plus" size={24} color="#fff" />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openWizard}
        label="New Order"
      />

      {/* PO Detail Modal */}
      <Portal>
        <Modal
          visible={!!selectedPO}
          onDismiss={() => setSelectedPO(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedPO && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                  {`PO #${selectedPO.order_id}`}
                </Text>
                <IconButton
                  icon={() => (
                    <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
                  )}
                  onPress={() => setSelectedPO(null)}
                />
              </View>

              <Chip
                style={[styles.modalStatus, { backgroundColor: getStatusColor(selectedPO.status) }]}
                textStyle={{ color: '#fff' }}
              >
                {selectedPO.status?.toUpperCase()}
              </Chip>

              <View style={styles.modalMetaRow}>
                <Chip compact mode="outlined">
                  {getOrderSourceLabel(selectedPO.review_context?.source_type)}
                </Chip>
                {selectedPO.review_context?.source_run_date && (
                  <Chip compact mode="outlined">
                    Run {new Date(selectedPO.review_context.source_run_date).toLocaleDateString()}
                  </Chip>
                )}
              </View>

              {selectedPO.expected_delivery_stale &&
                selectedPO.expected_delivery_status_message && (
                  <Card style={styles.warningCard} mode="contained">
                    <Card.Content>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.error, fontWeight: '600' }}
                      >
                        {selectedPO.expected_delivery_status_message}
                      </Text>
                    </Card.Content>
                  </Card>
                )}

              <Divider style={{ marginVertical: 12 }} />

              <List.Item
                title="Supplier"
                description={getSupplierLabel(selectedPO.supplier_name, selectedPO.supplier_id)}
                left={() => (
                  <MaterialCommunityIcons
                    name="truck"
                    size={24}
                    color={theme.colors.primary}
                    style={{ marginLeft: 8, alignSelf: 'center' }}
                  />
                )}
              />
              <List.Item
                title="Total Amount"
                description={`$${selectedPO.total_order_price?.toFixed(2) || '0.00'}`}
                left={() => (
                  <MaterialCommunityIcons
                    name="currency-usd"
                    size={24}
                    color={theme.colors.primary}
                    style={{ marginLeft: 8, alignSelf: 'center' }}
                  />
                )}
              />
              {selectedPO.expected_delivery_date && (
                <List.Item
                  title="Expected Delivery"
                  description={new Date(selectedPO.expected_delivery_date).toLocaleDateString()}
                  left={() => (
                    <MaterialCommunityIcons
                      name="calendar"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                />
              )}

              <Divider style={{ marginVertical: 12 }} />

              {selectedPO.status === 'cart' ? (
                <>
                  <Card style={styles.draftWorkspaceCard} mode="outlined">
                    <Card.Content>
                      <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                        Draft Workspace
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
                      >
                        Adjust the live draft here, then submit it when you are ready to place the
                        order.
                      </Text>
                    </Card.Content>
                  </Card>

                  <View style={styles.draftSummaryRow}>
                    <Card style={styles.draftSummaryCard} mode="outlined">
                      <Card.Content>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Items
                        </Text>
                        <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 4 }}>
                          {selectedPO.items?.length || 0}
                        </Text>
                      </Card.Content>
                    </Card>
                    <Card style={styles.draftSummaryCard} mode="outlined">
                      <Card.Content>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Total
                        </Text>
                        <Text
                          variant="titleLarge"
                          style={{ fontWeight: '700', marginTop: 4, color: theme.colors.primary }}
                        >
                          $
                          {selectedPO.items
                            ?.reduce(
                              (sum, item) =>
                                sum +
                                Number(
                                  item.total_item_price ||
                                    item.quantity_ordered * item.unit_price ||
                                    0
                                ),
                              0
                            )
                            .toFixed(2) || '0.00'}
                        </Text>
                      </Card.Content>
                    </Card>
                  </View>

                  <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8 }}>
                    Current Draft
                  </Text>

                  {selectedPO.items?.length ? (
                    selectedPO.items.map(item => (
                      <Card key={item.order_item_id} style={styles.draftItemCard} mode="outlined">
                        <Card.Content>
                          <View style={styles.draftItemHeader}>
                            <View style={{ flex: 1 }}>
                              <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                                {item.ingredient_name}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                              >
                                ${Number(item.unit_price || 0).toFixed(2)} per {item.unit}
                              </Text>
                            </View>
                            <Text
                              variant="titleSmall"
                              style={{ fontWeight: '700', color: theme.colors.primary }}
                            >
                              $
                              {Number(
                                item.total_item_price ||
                                  item.quantity_ordered * item.unit_price ||
                                  0
                              ).toFixed(2)}
                            </Text>
                          </View>

                          <View style={styles.draftItemControls}>
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleNudgeDraftItemQty(item, -1)}
                              disabled={updatingItem || removingItem}
                            >
                              -
                            </Button>
                            <Text variant="titleMedium" style={styles.draftQtyValue}>
                              {item.quantity_ordered}
                            </Text>
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleNudgeDraftItemQty(item, 1)}
                              disabled={updatingItem || removingItem}
                            >
                              +
                            </Button>
                            <Button
                              mode="text"
                              compact
                              onPress={() => openItemEditor(item)}
                              disabled={updatingItem || removingItem}
                            >
                              Edit
                            </Button>
                            <Button
                              mode="text"
                              compact
                              textColor={theme.colors.error}
                              onPress={() => handleRemoveDraftItem(item)}
                              disabled={updatingItem || removingItem}
                            >
                              Remove
                            </Button>
                          </View>
                        </Card.Content>
                      </Card>
                    ))
                  ) : (
                    <Card style={styles.builderPlaceholderCard} mode="outlined">
                      <Card.Content>
                        <Text
                          variant="titleSmall"
                          style={{ fontWeight: '600', textAlign: 'center' }}
                        >
                          No lines in this draft yet
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            textAlign: 'center',
                            marginTop: 6,
                          }}
                        >
                          This draft is empty now. You can keep reviewing it here or close it and
                          rebuild from the order workspace.
                        </Text>
                      </Card.Content>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8 }}>
                    Items ({selectedPO.items?.length || 0})
                  </Text>

                  {selectedPO.items?.map((item, index) => (
                    <List.Item
                      key={index}
                      title={item.ingredient_name || `Item ${index + 1}`}
                      description={`Qty: ${item.quantity_ordered}${item.quantity_received !== null && item.quantity_received !== undefined ? ` | Received: ${item.quantity_received}` : ''} | Unit: $${item.unit_price?.toFixed(2)}`}
                      right={() => (
                        <Text
                          variant="bodyMedium"
                          style={{ fontWeight: '600', alignSelf: 'center' }}
                        >
                          ${((item.quantity_ordered || 0) * (item.unit_price || 0)).toFixed(2)}
                        </Text>
                      )}
                    />
                  ))}
                </>
              )}

              {selectedPO.notes ? (
                <Card style={styles.notesCard} mode="outlined">
                  <Card.Content>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Notes
                    </Text>
                    <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                      {selectedPO.notes}
                    </Text>
                  </Card.Content>
                </Card>
              ) : null}

              {selectedPO.review_context?.explanation_items?.length ? (
                <>
                  <Divider style={{ marginVertical: 12 }} />

                  <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 8 }}>
                    Why This Order Exists
                  </Text>

                  {selectedPO.review_context.explanation_items.map(item => {
                    const explanation = item.explanation;
                    const warnings = getReviewItemWarnings(explanation?.assumption_flags);
                    return (
                      <Card
                        key={`${item.supplier_id}-${item.ingredient_id}`}
                        style={styles.explanationCard}
                        mode="outlined"
                      >
                        <Card.Content>
                          <View style={styles.explanationHeader}>
                            <View style={{ flex: 1 }}>
                              <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                                {item.ingredient_name}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={{ color: theme.colors.onSurfaceVariant }}
                              >
                                {item.quantity_to_order ?? 0} {item.unit || ''}
                                {item.packs_to_order ? ` • ${item.packs_to_order} packs` : ''}
                              </Text>
                            </View>
                            {typeof item.line_total === 'number' && (
                              <Text
                                variant="titleSmall"
                                style={{ color: theme.colors.primary, fontWeight: '700' }}
                              >
                                ${item.line_total.toFixed(2)}
                              </Text>
                            )}
                          </View>
                          {explanation?.summary ? (
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
                            >
                              {explanation.summary}
                            </Text>
                          ) : null}
                          {explanation ? (
                            <View style={styles.explanationBody}>
                              <Text variant="bodySmall" style={styles.explanationLine}>
                                Stock{' '}
                                {formatExplanationValue(explanation.why_reorder.current_stock)}{' '}
                                {explanation.why_reorder.current_unit} vs reorder point{' '}
                                {formatExplanationValue(explanation.why_reorder.reorder_point)}.
                              </Text>
                              <Text variant="bodySmall" style={styles.explanationLine}>
                                Lead {formatExplanationValue(explanation.why_reorder.lead_demand)} +
                                shelf {formatExplanationValue(explanation.why_reorder.shelf_demand)}{' '}
                                + safety{' '}
                                {formatExplanationValue(explanation.why_reorder.safety_stock)} =
                                target{' '}
                                {formatExplanationValue(explanation.why_reorder.reorder_target)}.
                              </Text>
                              <Text variant="bodySmall" style={styles.explanationLine}>
                                ABC {explanation.policy_factors.abc_class} x{' '}
                                {formatExplanationValue(explanation.policy_factors.abc_multiplier)};
                                MOQ floor{' '}
                                {formatExplanationValue(explanation.policy_factors.moq_floor)};
                                final before packs{' '}
                                {formatExplanationValue(
                                  explanation.quantity_factors.final_quantity_before_pack_rounding
                                )}
                                .
                              </Text>
                              <Text variant="bodySmall" style={styles.explanationLine}>
                                {formatExplanationValue(
                                  explanation.quantity_factors.packs_to_order
                                )}{' '}
                                packs x{' '}
                                {formatExplanationValue(
                                  explanation.quantity_factors.quantity_per_pack
                                )}{' '}
                                {explanation.quantity_factors.supplier_unit} ={' '}
                                {formatExplanationValue(
                                  explanation.quantity_factors.total_quantity_ordered
                                )}{' '}
                                {explanation.quantity_factors.supplier_unit}.
                              </Text>
                              <Text variant="bodySmall" style={styles.explanationLine}>
                                Supplier: {explanation.supplier_factors.selected_supplier} (
                                {formatSelectionRule(explanation.supplier_factors.selection_rule)}).
                              </Text>
                              {warnings.length ? (
                                <Text
                                  variant="bodySmall"
                                  style={[styles.explanationLine, { color: theme.colors.error }]}
                                >
                                  Assumptions: {warnings.join(', ')}.
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
                        </Card.Content>
                      </Card>
                    );
                  })}
                </>
              ) : null}

              <Divider style={{ marginVertical: 12 }} />

              <View style={styles.modalActions}>
                {selectedPO.status === 'cart' && (
                  <Button
                    mode="contained"
                    buttonColor="#2196f3"
                    onPress={() => handleStatusUpdate(selectedPO.order_id, 'pending')}
                    loading={updatingStatus}
                  >
                    Submit Draft
                  </Button>
                )}
                {selectedPO.status === 'pending' && (
                  <Button mode="contained" onPress={() => openReceiptModal(selectedPO)}>
                    Receive Order
                  </Button>
                )}
                {['cart', 'pending'].includes(selectedPO.status) && (
                  <Button
                    mode="outlined"
                    textColor="#f44336"
                    onPress={() => handleStatusUpdate(selectedPO.order_id, 'cancelled')}
                    loading={updatingStatus}
                    style={{ marginTop: 8 }}
                  >
                    Cancel PO
                  </Button>
                )}
              </View>
            </ScrollView>
          )}
        </Modal>

        <Modal
          visible={!!receiptDraft}
          onDismiss={closeReceiptModal}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 12 }}>
            Receive Order
          </Text>
          {receiptDraft && (
            <ScrollView style={{ maxHeight: 420 }}>
              <TextInput
                label="Actual delivery date"
                value={receiptDraft.deliveryDate}
                onChangeText={value =>
                  setReceiptDraft(prev => (prev ? { ...prev, deliveryDate: value } : prev))
                }
                mode="outlined"
                style={{ marginBottom: 12 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Chip compact mode="outlined" style={{ marginRight: 8 }}>
                  {receiptDraft.items.length} lines
                </Chip>
                <Button mode="text" compact onPress={resetReceiptDraftToOrdered}>
                  Match All
                </Button>
              </View>
              {receiptDraft.items.map(item => {
                const receivedQty = Number(item.quantity_received || 0);
                const variance = receivedQty - item.quantity_ordered;
                return (
                  <Card key={item.order_item_id} style={styles.explanationCard} mode="outlined">
                    <Card.Content>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                            {item.ingredient_name}
                          </Text>
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                          >
                            Ordered {item.quantity_ordered} {item.unit}
                          </Text>
                        </View>
                        <View style={{ width: 128 }}>
                          <TextInput
                            label="Received"
                            value={item.quantity_received}
                            onChangeText={value =>
                              updateReceiptDraftItem(item.order_item_id, value)
                            }
                            keyboardType="numeric"
                            mode="outlined"
                            dense
                          />
                        </View>
                      </View>
                      <Chip
                        compact
                        mode="outlined"
                        style={{ alignSelf: 'flex-start', marginTop: 8 }}
                      >
                        {variance === 0
                          ? 'match'
                          : variance < 0
                            ? `${Math.abs(variance)} short`
                            : `${variance} over`}
                      </Chip>
                    </Card.Content>
                  </Card>
                );
              })}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <Button mode="text" onPress={closeReceiptModal} disabled={receivingOrder}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleReceiveOrder}
              loading={receivingOrder}
              disabled={receivingOrder}
            >
              Confirm Receipt
            </Button>
          </View>
        </Modal>

        {/* Edit Item Modal */}
        <Modal
          visible={!!editingItem}
          onDismiss={closeItemEditor}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 12 }}>
            Edit Item
          </Text>
          <TextInput
            label="Quantity"
            value={editQty}
            onChangeText={setEditQty}
            keyboardType="numeric"
            mode="outlined"
            style={{ marginBottom: 8 }}
          />
          {editingItem && (
            <>
              <Text style={{ marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
                Unit: {editingItem.unit}
              </Text>
              <Text style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                Unit Price: ${Number(editingItem.unit_price).toFixed(2)}
              </Text>
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Button mode="text" onPress={closeItemEditor} disabled={updatingItem}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveItemEdit}
              loading={updatingItem}
              disabled={updatingItem}
            >
              Update
            </Button>
          </View>
        </Modal>

        {/* New Order Wizard Modal */}
        <Modal
          visible={wizardOpen}
          onDismiss={closeWizard}
          contentContainerStyle={[styles.wizardModal, { backgroundColor: theme.colors.surface }]}
        >
          {/* Wizard Header */}
          <View style={styles.wizardHeader}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="cart-plus" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                  Build Draft Purchase Order
                </Text>
              </View>
              <Text
                variant="bodySmall"
                style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}
              >
                {wizardDescriptor}
              </Text>
              <View style={[styles.modalMetaRow, { marginTop: 10 }]}>
                <Chip compact mode="outlined">{`Step ${wizardStep + 1} of 2`}</Chip>
                {wizardMode && wizardStep === 1 ? (
                  <Chip compact mode="outlined">
                    {wizardMode === 'supplier' ? 'Supplier Builder' : 'Ingredient Builder'}
                  </Chip>
                ) : null}
              </View>
            </View>
            <IconButton
              icon={() => (
                <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
              )}
              onPress={closeWizard}
            />
          </View>

          {/* Wizard Progress */}
          <View style={styles.wizardProgress}>
            {WIZARD_STEPS.map((step, index) => (
              <View key={step} style={styles.wizardStep}>
                <View
                  style={[
                    styles.wizardStepCircle,
                    {
                      backgroundColor:
                        index <= wizardStep ? theme.colors.primary : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  {index < wizardStep ? (
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: index === wizardStep ? '#fff' : theme.colors.onSurfaceVariant,
                        fontWeight: '600',
                      }}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  variant="bodySmall"
                  style={{
                    color:
                      index <= wizardStep ? theme.colors.primary : theme.colors.onSurfaceVariant,
                    fontWeight: index === wizardStep ? '600' : '400',
                  }}
                >
                  {step}
                </Text>
                {index < WIZARD_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.wizardStepLine,
                      {
                        backgroundColor:
                          index < wizardStep ? theme.colors.primary : theme.colors.surfaceVariant,
                      },
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          <Divider />

          {/* Wizard Content */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 16,
              marginBottom: 8,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surfaceVariant,
            }}
          >
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Save drafts first, then submit them when you are actually ready to place the order.
            </Text>
          </View>
          {wizardMode === 'supplier' && suggestions && (
            <View
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text
                variant="labelMedium"
                style={{
                  color: getForecastStatusTone(suggestions.forecast_status),
                  fontWeight: '700',
                }}
              >
                {suggestions.forecast_status.toUpperCase()} ·{' '}
                {getForecastSourceLabel(suggestions.forecast_source_type)} forecast
              </Text>
              <Text
                variant="bodySmall"
                style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}
              >
                {suggestions.forecast_status_message || 'Forecast status available for this draft.'}
              </Text>
              {suggestions.forecast_generated_at && (
                <Text
                  variant="bodySmall"
                  style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}
                >
                  Generated {new Date(suggestions.forecast_generated_at).toLocaleString()}
                </Text>
              )}
            </View>
          )}
          <ScrollView style={{ flex: 1 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {renderWizardContent()}
          </ScrollView>

          {/* Wizard Footer */}
          <Divider />
          <View style={styles.wizardFooter}>
            <Button mode="text" onPress={closeWizard}>
              Close
            </Button>
            <View style={{ flex: 1 }} />
            {wizardStep > 0 && (
              <Button
                mode="outlined"
                onPress={handleBack}
                icon="arrow-left"
                style={{ marginRight: 8 }}
              >
                Back
              </Button>
            )}
            {wizardStep < 1 ? (
              <Button
                mode="contained"
                onPress={handleNext}
                disabled={!canProceed()}
                icon="arrow-right"
                contentStyle={{ flexDirection: 'row-reverse' }}
              >
                Continue
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleCreate}
                disabled={!canProceed() || creating}
                loading={creating}
                icon="check"
                buttonColor={theme.colors.primary}
              >
                {creating
                  ? 'Creating...'
                  : wizardMode === 'supplier'
                    ? `Save ${reviewTotals.supplierCount} Draft(s)`
                    : `Save ${Math.max(1, ingredientReviewTotals.supplierCount)} Draft(s)`}
              </Button>
            )}
          </View>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbar.open}
        onDismiss={() => setSnackbar(prev => ({ ...prev, open: false }))}
        duration={3500}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    marginBottom: 12,
  },
  previewAction: {
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    marginBottom: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statusIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    flex: 1,
    fontWeight: '600',
  },
  modalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  warningCard: {
    marginTop: 12,
    borderRadius: 12,
  },
  notesCard: {
    marginTop: 8,
    borderRadius: 12,
  },
  explanationCard: {
    marginBottom: 10,
    borderRadius: 12,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  explanationBody: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  explanationLine: {
    marginTop: 4,
  },
  countChip: {
    minHeight: 26,
    justifyContent: 'center',
    paddingVertical: 1,
  },
  countChipText: {
    lineHeight: 16,
    textAlignVertical: 'center',
  },
  card: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  poNumber: {
    fontWeight: '600',
  },
  statusChip: {
    minHeight: 28,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
  cardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modal: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalStatus: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 30,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  modalActions: {
    marginTop: 8,
  },
  draftWorkspaceCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  draftSummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  draftSummaryCard: {
    flex: 1,
    borderRadius: 12,
  },
  draftItemCard: {
    marginBottom: 10,
    borderRadius: 12,
  },
  draftItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  draftItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  draftQtyValue: {
    minWidth: 32,
    textAlign: 'center',
    fontWeight: '700',
  },
  builderPlaceholderCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  wizardModal: {
    margin: 16,
    borderRadius: 16,
    maxHeight: '90%',
    flex: 1,
  },
  wizardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  wizardProgress: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  wizardStep: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  wizardStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  wizardStepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  wizardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
});
