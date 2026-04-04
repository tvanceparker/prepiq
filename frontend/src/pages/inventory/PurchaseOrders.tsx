import React, { useMemo, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  Divider,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RemoveIcon from '@mui/icons-material/Remove';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  addItemToPurchaseOrder,
  updatePurchaseOrderItem,
  removeItemFromPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  getIngredientNames,
  generatePOSuggestions,
  createPOsFromSuggestions,
  getIngredientsStockLevels,
  getIngredientSuppliers,
  getLastEodDate,
} from '../../api/inventory';
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderCreate,
  PurchaseOrderReceiptSummary,
  PurchaseOrderStatus,
  IngredientName,
  POSuggestionsResponse,
  IngredientStockLevel,
  IngredientSupplierOption,
} from '../../interfaces/inventory';
import {
  POMethodSelector,
  POSupplierConfig,
  POIngredientBrowser,
  POSupplierReview,
  WizardMode,
  IngredientCartItem,
} from './components/po-wizard';

const statusTabs: { label: string; value: PurchaseOrderStatus }[] = [
  { label: 'Drafts', value: 'cart' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'delivered' },
];

type WizardStep = 0 | 1;

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PurchaseOrderStatus>('cart');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(0);
  const [wizardMode, setWizardMode] = useState<WizardMode | null>(null);

  // Supplier mode state
  const [useCachedForecast, setUseCachedForecast] = useState(true);
  const [horizonDays, setHorizonDays] = useState(7);
  const [suggestions, setSuggestions] = useState<POSuggestionsResponse | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<number>>(new Set());

  // Ingredient mode state
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientStockLevel | null>(null);
  const [ingredientSupplier, setIngredientSupplier] = useState<IngredientSupplierOption | null>(
    null
  );
  const [ingredientQty, setIngredientQty] = useState(1);
  const [ingredientCart, setIngredientCart] = useState<IngredientCartItem[]>([]);

  // Notes & Snackbar
  const [orderNotes, setOrderNotes] = useState('');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showToast = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => setSnackbar({ open: true, message, severity });

  const formatReceiptSummary = (summary: PurchaseOrderReceiptSummary): string => {
    if (summary.receipt_mode === 'already_received') {
      return `PO #${summary.order_id} was already received on ${dayjs(summary.actual_delivery_date).format('MMM D, YYYY')}.`;
    }
    if (summary.receipt_mode === 'resumed') {
      return `PO #${summary.order_id} receipt resumed: ${summary.newly_received_item_count} new item(s), ${summary.already_received_item_count} already received.`;
    }
    return `PO #${summary.order_id} received: ${summary.newly_received_item_count} item(s) on ${dayjs(summary.actual_delivery_date).format('MMM D, YYYY')}.`;
  };

  // Queries
  const { data: ingredientNames = [] } = useQuery<IngredientName[]>({
    queryKey: ['ingredient_names'],
    queryFn: getIngredientNames,
  });

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders', status],
    queryFn: () => getPurchaseOrders({ status }),
  });

  const { data: cartOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders', 'cart'],
    queryFn: () => getPurchaseOrders({ status: 'cart' }),
  });

  const { data: pendingOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders', 'pending'],
    queryFn: () => getPurchaseOrders({ status: 'pending' }),
  });

  const { data: deliveredOrders = [] } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders', 'delivered'],
    queryFn: () => getPurchaseOrders({ status: 'delivered' }),
  });

  const { data: stockLevels = [], isLoading: stockLoading } = useQuery<IngredientStockLevel[]>({
    queryKey: ['ingredients_stock_levels'],
    queryFn: getIngredientsStockLevels,
    enabled: wizardOpen && wizardMode === 'ingredient',
  });

  const { data: lastEodData } = useQuery({
    queryKey: ['last_eod_date'],
    queryFn: getLastEodDate,
    enabled: wizardOpen && wizardMode === 'supplier',
  });

  const { data: ingredientSuppliers = [], isLoading: suppliersLoading } = useQuery<
    IngredientSupplierOption[]
  >({
    queryKey: ['ingredient_suppliers', selectedIngredient?.ingredient_id],
    queryFn: () => getIngredientSuppliers(selectedIngredient!.ingredient_id),
    enabled: !!selectedIngredient && wizardOpen && wizardMode === 'ingredient',
  });

  // Mutations
  const addItemMut = useMutation({
    mutationFn: (args: { order_id: number; item: Partial<PurchaseOrderItem> }) =>
      addItemToPurchaseOrder(args.order_id, args.item),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      if (selectedOrder) {
        const updated =
          (await getPurchaseOrders({ status }))?.find(o => o.order_id === selectedOrder.order_id) ||
          null;
        setSelectedOrder(updated);
      }
      showToast('Item added.');
    },
  });

  const removeItemMut = useMutation({
    mutationFn: (args: { order_id: number; order_item_id: number }) =>
      removeItemFromPurchaseOrder(args.order_id, args.order_item_id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      if (selectedOrder) {
        const updated =
          (await getPurchaseOrders({ status }))?.find(o => o.order_id === selectedOrder.order_id) ||
          null;
        setSelectedOrder(updated);
      }
      showToast('Item removed.', 'info');
    },
  });

  const updateItemMut = useMutation({
    mutationFn: (args: {
      order_id: number;
      order_item_id: number;
      updates: Partial<PurchaseOrderItem>;
    }) => updatePurchaseOrderItem(args.order_id, args.order_item_id, args.updates),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      if (selectedOrder) {
        const updated =
          (await getPurchaseOrders({ status }))?.find(o => o.order_id === selectedOrder.order_id) ||
          null;
        setSelectedOrder(updated);
      }
      showToast('Item updated.');
    },
  });

  const updateStatusMut = useMutation({
    mutationFn: (args: { order_id: number; status: PurchaseOrderStatus }) => {
      if (args.status === 'delivered') {
        return receivePurchaseOrder(args.order_id);
      }
      return updatePurchaseOrderStatus(args.order_id, args.status);
    },
    onSuccess: async data => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      setSelectedOrder(null);
      if (data && typeof data === 'object' && 'receipt_mode' in data) {
        showToast(formatReceiptSummary(data as PurchaseOrderReceiptSummary), 'info');
        return;
      }
      showToast('Order status updated.');
    },
  });

  const generateMut = useMutation({
    mutationFn: (options?: { horizonDaysOverride?: number; useCachedForecastOverride?: boolean }) =>
      generatePOSuggestions(
        options?.horizonDaysOverride ?? horizonDays,
        options?.useCachedForecastOverride ?? useCachedForecast
      ),
    onSuccess: (data: POSuggestionsResponse) => {
      setSuggestions(data);
      const allItems = new Map<string, number>();
      data.all_items.forEach(item => {
        allItems.set(`${item.supplier_id}-${item.ingredient_id}`, item.quantity_to_order);
      });
      setSelectedItems(allItems);
      setExpandedSuppliers(new Set(data.suggestions.map(s => s.supplier_id)));
      if (data.all_items.length === 0) {
        showToast(
          `No reorder suggestions were generated from the ${data.forecast_source} forecast.`,
          'info'
        );
        return;
      }
      showToast(
        `Generated ${data.all_items.length} suggestion${data.all_items.length === 1 ? '' : 's'} across ${data.suggestions.length} supplier${data.suggestions.length === 1 ? '' : 's'} using the ${data.forecast_source} forecast.`
      );
    },
    onError: (err: any) => {
      showToast(
        err?.response?.data?.detail || err?.message || 'Failed to generate suggestions',
        'error'
      );
    },
  });

  const createFromSuggestionsMut = useMutation({
    mutationFn: () => {
      const selectedItemsList: any[] = [];
      suggestions?.all_items.forEach(item => {
        const key = `${item.supplier_id}-${item.ingredient_id}`;
        if (selectedItems.has(key)) {
          selectedItemsList.push({
            ...item,
            quantity_to_order: selectedItems.get(key) || item.quantity_to_order,
          });
        }
      });
      return createPOsFromSuggestions(selectedItemsList, orderNotes || undefined);
    },
    onSuccess: async data => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      showToast(`Created ${data.length} draft order(s)!`);
      closeWizard();
      setStatus('cart');
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.detail || err?.message || 'Failed to create orders', 'error');
    },
  });

  // Wizard helpers
  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    setWizardStep(0);
    setWizardMode(null);
    setSuggestions(null);
    setSelectedItems(new Map());
    setSelectedIngredient(null);
    setIngredientSupplier(null);
    setIngredientQty(1);
    setIngredientCart([]);
    setOrderNotes('');
  }, []);

  const openSupplierPreviewWizard = useCallback(() => {
    setWizardOpen(true);
    setWizardStep(1);
    setWizardMode('supplier');
  }, []);

  const handleRunFreshReorderPreview = useCallback(() => {
    setUseCachedForecast(false);
    setSuggestions(null);
    setSelectedItems(new Map());
    setExpandedSuppliers(new Set());
    openSupplierPreviewWizard();
    generateMut.mutate({
      horizonDaysOverride: horizonDays,
      useCachedForecastOverride: false,
    });
  }, [generateMut, horizonDays, openSupplierPreviewWizard]);

  const upsertIngredientCartItem = useCallback((item: IngredientCartItem) => {
    setIngredientCart(prev => {
      const next = [...prev];
      const idx = next.findIndex(
        i =>
          i.ingredient.ingredient_id === item.ingredient.ingredient_id &&
          i.supplier.supplier_id === item.supplier.supplier_id
      );
      if (idx >= 0) {
        next[idx] = { ...next[idx], qtyPacks: next[idx].qtyPacks + item.qtyPacks };
      } else {
        next.push(item);
      }
      return next;
    });
  }, []);

  const updateCartItemQty = useCallback(
    (ingredientId: number, supplierId: number, qtyPacks: number) => {
      setIngredientCart(prev =>
        prev.map(item => {
          if (
            item.ingredient.ingredient_id === ingredientId &&
            item.supplier.supplier_id === supplierId
          ) {
            return { ...item, qtyPacks: Math.max(1, qtyPacks) };
          }
          return item;
        })
      );
    },
    []
  );

  const removeCartItem = useCallback((ingredientId: number, supplierId: number) => {
    setIngredientCart(prev =>
      prev.filter(
        item =>
          !(
            item.ingredient.ingredient_id === ingredientId &&
            item.supplier.supplier_id === supplierId
          )
      )
    );
  }, []);

  const handleCreateIngredientOrdersFromCart = async () => {
    if (ingredientCart.length === 0) return;

    try {
      const grouped = new Map<
        number,
        { supplier: IngredientCartItem['supplier']; items: IngredientCartItem[] }
      >();

      ingredientCart.forEach(item => {
        if (!grouped.has(item.supplier.supplier_id)) {
          grouped.set(item.supplier.supplier_id, { supplier: item.supplier, items: [] });
        }
        grouped.get(item.supplier.supplier_id)!.items.push(item);
      });

      let createdCount = 0;
      for (const [supplierId, group] of grouped.entries()) {
        const payload: PurchaseOrderCreate = {
          supplier_id: supplierId,
          expected_delivery_date: dayjs()
            .add(group.supplier.lead_time_days, 'day')
            .format('YYYY-MM-DD'),
          items: group.items.map(it => ({
            ingredient_id: it.ingredient.ingredient_id,
            ingredient_supplier_id: it.supplier.ingredient_supplier_id,
            quantity_ordered: it.qtyPacks * it.supplier.pack_size,
            unit: it.supplier.pack_unit,
            unit_price: it.supplier.unit_price,
          })),
          notes: orderNotes || undefined,
        };

        await createPurchaseOrder(payload);
        createdCount += 1;
      }

      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      showToast(`Created ${createdCount} draft order${createdCount === 1 ? '' : 's'}!`);
      closeWizard();
      setStatus('cart');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to create order(s)', 'error');
    }
  };

  // Calculate totals for review
  const reviewTotals = useMemo(() => {
    if (!suggestions) return { itemCount: 0, total: 0, supplierCount: 0 };
    let total = 0,
      itemCount = 0;
    const supplierSet = new Set<number>();
    suggestions.all_items.forEach(item => {
      const key = `${item.supplier_id}-${item.ingredient_id}`;
      if (selectedItems.has(key)) {
        total += (selectedItems.get(key) || item.quantity_to_order) * item.unit_price;
        itemCount++;
        supplierSet.add(item.supplier_id);
      }
    });
    return { itemCount, total, supplierCount: supplierSet.size };
  }, [suggestions, selectedItems]);

  const supplierSidebarGroups = useMemo(() => {
    if (!suggestions) return [];

    return suggestions.suggestions
      .map(group => {
        const items = group.items
          .filter(item => selectedItems.has(`${group.supplier_id}-${item.ingredient_id}`))
          .map(item => {
            const key = `${group.supplier_id}-${item.ingredient_id}`;
            const quantity = selectedItems.get(key) || item.quantity_to_order;
            return {
              key,
              ingredientId: item.ingredient_id,
              ingredientName: item.ingredient_name,
              quantity,
              unit: item.unit,
              lineTotal: quantity * item.unit_price,
              unitPrice: item.unit_price,
            };
          });

        return {
          supplierId: group.supplier_id,
          supplierName: group.supplier_name,
          items,
          total: items.reduce((sum, item) => sum + item.lineTotal, 0),
        };
      })
      .filter(group => group.items.length > 0);
  }, [suggestions, selectedItems]);

  const ingredientCartTotals = useMemo(() => {
    const supplierSet = new Set<number>();
    let total = 0;
    let itemCount = 0;
    ingredientCart.forEach(item => {
      supplierSet.add(item.supplier.supplier_id);
      itemCount += 1;
      total += item.qtyPacks * item.supplier.pack_size * item.supplier.unit_price;
    });
    return { itemCount, total, supplierCount: supplierSet.size };
  }, [ingredientCart]);

  const ingredientSidebarGroups = useMemo(() => {
    const map = new Map<
      number,
      {
        supplierId: number;
        supplierName: string;
        leadTime: number;
        items: Array<{
          ingredientId: number;
          ingredientName: string;
          quantity: number;
          packSize: number;
          packUnit: string;
          lineTotal: number;
          supplierId: number;
        }>;
      }
    >();

    ingredientCart.forEach(item => {
      if (!map.has(item.supplier.supplier_id)) {
        map.set(item.supplier.supplier_id, {
          supplierId: item.supplier.supplier_id,
          supplierName: item.supplier.supplier_name,
          leadTime: item.supplier.lead_time_days,
          items: [],
        });
      }

      map.get(item.supplier.supplier_id)!.items.push({
        ingredientId: item.ingredient.ingredient_id,
        ingredientName: item.ingredient.ingredient_name,
        quantity: item.qtyPacks,
        packSize: item.supplier.pack_size,
        packUnit: item.supplier.pack_unit,
        lineTotal: item.qtyPacks * item.supplier.pack_size * item.supplier.unit_price,
        supplierId: item.supplier.supplier_id,
      });
    });

    return Array.from(map.values());
  }, [ingredientCart]);

  // Order list grouping
  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    orders.forEach(po => {
      const key = po.supplier_name || `Supplier ${po.supplier_id}`;
      map.set(key, [...(map.get(key) || []), po]);
    });
    return Array.from(map.entries());
  }, [orders]);

  const orderCountsByStatus = useMemo(
    () => ({
      cart: cartOrders.length,
      pending: pendingOrders.length,
      delivered: deliveredOrders.length,
    }),
    [cartOrders.length, pendingOrders.length, deliveredOrders.length]
  );

  // Navigation helpers
  const canProceed = () => {
    if (wizardStep === 0) return wizardMode !== null;
    if (wizardMode === 'supplier') return selectedItems.size > 0;
    if (wizardMode === 'ingredient') return ingredientCart.length > 0;
    return true;
  };

  const handleNext = () => {
    if (wizardStep === 0) setWizardStep(1);
  };

  const handleBack = () => {
    if (wizardStep === 1) {
      setWizardStep(0);
      setSuggestions(null);
    }
  };

  const handleCreate = () => {
    if (wizardMode === 'supplier') createFromSuggestionsMut.mutate();
    else handleCreateIngredientOrdersFromCart();
  };

  const updateSuggestedItemQty = useCallback(
    (supplierId: number, ingredientId: number, quantity: number) => {
      setSelectedItems(prev => {
        const next = new Map(prev);
        const key = `${supplierId}-${ingredientId}`;
        if (!next.has(key)) return next;
        next.set(key, Math.max(1, quantity));
        return next;
      });
    },
    []
  );

  const removeSuggestedItem = useCallback((supplierId: number, ingredientId: number) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.delete(`${supplierId}-${ingredientId}`);
      return next;
    });
  }, []);

  const renderWizardMainContent = () => {
    if (wizardStep === 0) {
      return <POMethodSelector selectedMode={wizardMode} onSelectMode={setWizardMode} />;
    }

    if (wizardMode === 'supplier') {
      return (
        <Stack spacing={3}>
          <POSupplierConfig
            useCachedForecast={useCachedForecast}
            setUseCachedForecast={setUseCachedForecast}
            horizonDays={horizonDays}
            setHorizonDays={setHorizonDays}
            lastEodDate={lastEodData?.last_eod_run_date}
            onGenerate={() => generateMut.mutate({})}
            onGenerateFresh={handleRunFreshReorderPreview}
            isGenerating={generateMut.isPending}
          />

          {suggestions ? (
            suggestions.all_items.length > 0 ? (
              <POSupplierReview
                suggestions={suggestions}
                selectedItems={selectedItems}
                setSelectedItems={setSelectedItems}
                expandedSuppliers={expandedSuppliers}
                setExpandedSuppliers={setExpandedSuppliers}
                orderNotes={orderNotes}
                setOrderNotes={setOrderNotes}
                showSummary={false}
                showNotes={false}
                title="Generated Suggestions"
                maxHeight={480}
              />
            ) : (
              <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                  No reorder suggestions were generated
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  That usually means current stock stayed above reorder points for this horizon, or
                  the forecast did not produce enough projected demand to trigger an order.
                </Typography>
              </Paper>
            )
          ) : (
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Suggestions will appear here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate supplier recommendations, then refine quantities on the left while the
                draft stays visible on the right.
              </Typography>
            </Paper>
          )}
        </Stack>
      );
    }

    if (wizardMode === 'ingredient') {
      return (
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
          cartItems={ingredientCart}
          onAddToCart={upsertIngredientCartItem}
          onUpdateCartItemQty={updateCartItemQty}
          onRemoveCartItem={removeCartItem}
        />
      );
    }

    return null;
  };

  const renderBuilderSidebar = () => {
    if (!wizardMode) return null;

    const isSupplier = wizardMode === 'supplier';
    const hasItems = isSupplier
      ? supplierSidebarGroups.length > 0
      : ingredientSidebarGroups.length > 0;
    const totals = isSupplier ? reviewTotals : ingredientCartTotals;

    return (
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Current Draft
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isSupplier
                  ? 'Selected from supplier recommendations'
                  : 'Items grouped by supplier as you build the order'}
              </Typography>
            </Box>
            {isSupplier && suggestions && (
              <Chip
                size="small"
                label={`${suggestions.forecast_source} · ${suggestions.horizon_days}d`}
                variant="outlined"
                color="primary"
              />
            )}
          </Stack>

          <Stack direction="row" spacing={1}>
            <Paper variant="outlined" sx={{ p: 1.25, flex: 1, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">
                Items
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {totals.itemCount}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25, flex: 1, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">
                Suppliers
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {totals.supplierCount}
              </Typography>
            </Paper>
            <Paper variant="outlined" sx={{ p: 1.25, flex: 1, bgcolor: 'background.default' }}>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                ${totals.total.toFixed(2)}
              </Typography>
            </Paper>
          </Stack>
        </Stack>

        <Box sx={{ flex: 1, overflow: 'auto', pr: 0.5 }}>
          {!hasItems ? (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: 'center',
                color: 'text.secondary',
                bgcolor: 'background.default',
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 36, mb: 1, opacity: 0.45 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                No items in the draft yet
              </Typography>
              <Typography variant="body2">
                {isSupplier
                  ? 'Generate suggestions and choose the items you want to turn into draft purchase orders.'
                  : 'Pick an ingredient, choose a supplier, and add quantities. The draft stays here while you work.'}
              </Typography>
            </Paper>
          ) : isSupplier ? (
            <Stack spacing={1.5}>
              {supplierSidebarGroups.map(group => (
                <Paper key={group.supplierId} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="subtitle2" fontWeight={700}>
                      {group.supplierName}
                    </Typography>
                    <Typography variant="body2" color="primary.main" fontWeight={700}>
                      ${group.total.toFixed(2)}
                    </Typography>
                  </Stack>
                  <Stack spacing={1}>
                    {group.items.map(item => (
                      <Paper
                        key={item.key}
                        variant="outlined"
                        sx={{ p: 1.25, bgcolor: 'background.default' }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.ingredientName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${item.unitPrice.toFixed(2)} per {item.unit}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <IconButton
                              size="small"
                              onClick={() =>
                                updateSuggestedItemQty(
                                  group.supplierId,
                                  item.ingredientId,
                                  item.quantity - 1
                                )
                              }
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{ minWidth: 34, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                updateSuggestedItemQty(
                                  group.supplierId,
                                  item.ingredientId,
                                  item.quantity + 1
                                )
                              }
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                          <Typography variant="body2" sx={{ minWidth: 82, textAlign: 'right' }}>
                            ${item.lineTotal.toFixed(2)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeSuggestedItem(group.supplierId, item.ingredientId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              {ingredientSidebarGroups.map(group => (
                <Paper key={group.supplierId} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {group.supplierName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Lead time: {group.leadTime} day{group.leadTime === 1 ? '' : 's'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack spacing={1}>
                    {group.items.map(item => (
                      <Paper
                        key={`${item.ingredientId}-${item.supplierId}`}
                        variant="outlined"
                        sx={{ p: 1.25, bgcolor: 'background.default' }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {item.ingredientName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.quantity * item.packSize} {item.packUnit}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.25} alignItems="center">
                            <IconButton
                              size="small"
                              onClick={() =>
                                updateCartItemQty(
                                  item.ingredientId,
                                  item.supplierId,
                                  item.quantity - 1
                                )
                              }
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                            <Typography sx={{ minWidth: 34, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                updateCartItemQty(
                                  item.ingredientId,
                                  item.supplierId,
                                  item.quantity + 1
                                )
                              }
                            >
                              <AddIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                          <Typography variant="body2" sx={{ minWidth: 82, textAlign: 'right' }}>
                            ${item.lineTotal.toFixed(2)}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeCartItem(item.ingredientId, item.supplierId)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <Box sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Order Notes (optional)"
            value={orderNotes}
            onChange={e => setOrderNotes(e.target.value)}
            multiline
            rows={3}
          />
        </Box>
      </Paper>
    );
  };

  // Item Editor Component
  const ItemEditor = ({ order }: { order: PurchaseOrder }) => {
    const [selIngredient, setSelIngredient] = useState<IngredientName | null>(null);
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('unit');
    const [price, setPrice] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editQty, setEditQty] = useState('');

    const addItem = () => {
      if (!selIngredient || isNaN(Number(qty)) || isNaN(Number(price))) {
        showToast('Fill ingredient, quantity and price.', 'warning');
        return;
      }
      addItemMut.mutate({
        order_id: order.order_id,
        item: {
          ingredient_id: selIngredient.ingredient_id,
          quantity_ordered: Number(qty),
          unit,
          unit_price: Number(price),
        },
      });
      setSelIngredient(null);
      setQty('');
      setPrice('');
    };

    const beginEdit = (item: PurchaseOrderItem) => {
      if (order.status !== 'cart') return;
      setEditingId(item.order_item_id);
      setEditQty(item.quantity_ordered.toString());
    };

    const cancelEdit = () => {
      setEditingId(null);
      setEditQty('');
    };

    const saveEdit = () => {
      if (editingId === null) return;
      const qtyVal = Number(editQty);
      if (Number.isNaN(qtyVal) || qtyVal <= 0) {
        showToast('Enter a valid quantity.', 'warning');
        return;
      }
      updateItemMut.mutate(
        {
          order_id: order.order_id,
          order_item_id: editingId,
          updates: {
            quantity_ordered: qtyVal,
          },
        },
        {
          onSuccess: () => {
            cancelEdit();
          },
        }
      );
    };

    const total = (order.items || []).reduce((s, it) => s + (Number(it.total_item_price) || 0), 0);

    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Order #{order.order_id} • {order.supplier_name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Expected Delivery: {order.expected_delivery_date || '-'}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
          <Autocomplete
            options={ingredientNames}
            getOptionLabel={opt => opt.ingredient_name}
            value={selIngredient}
            onChange={(_, v) => setSelIngredient(v)}
            renderInput={params => <TextField {...params} label="Ingredient" size="small" />}
            sx={{ minWidth: 240 }}
          />
          <TextField
            size="small"
            label="Qty"
            value={qty}
            onChange={e => setQty(e.target.value)}
            sx={{ width: 100 }}
          />
          <TextField
            size="small"
            label="Unit"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            sx={{ width: 120 }}
          />
          <TextField
            size="small"
            label="Unit Price"
            value={price}
            onChange={e => setPrice(e.target.value)}
            sx={{ width: 140 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={addItem}>
            Add Item
          </Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ingredient</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Line Total</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(order.items || []).map(it => {
              const isEditing = editingId === it.order_item_id;
              const qtyVal = isEditing ? editQty : it.quantity_ordered.toString();
              const lineTotal = Number(qtyVal || 0) * Number(it.unit_price || 0);

              return (
                <TableRow
                  key={it.order_item_id}
                  hover={order.status === 'cart'}
                  onClick={() => beginEdit(it)}
                  sx={{ cursor: order.status === 'cart' ? 'pointer' : 'default' }}
                  selected={isEditing}
                >
                  <TableCell>{it.ingredient_name}</TableCell>
                  <TableCell align="right" sx={{ width: 120 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={qtyVal}
                        onChange={e => setEditQty(e.target.value)}
                        inputProps={{ min: 0, step: '0.01' }}
                      />
                    ) : (
                      it.quantity_ordered
                    )}
                  </TableCell>
                  <TableCell sx={{ width: 120 }}>{it.unit}</TableCell>
                  <TableCell align="right" sx={{ width: 140 }}>
                    {`$${Number(it.unit_price).toFixed(2)}`}
                  </TableCell>
                  <TableCell align="right">${lineTotal.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    {isEditing ? (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={e => {
                            e.stopPropagation();
                            saveEdit();
                          }}
                          disabled={updateItemMut.isPending}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={e => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          disabled={updateItemMut.isPending}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          removeItemMut.mutate({
                            order_id: order.order_id,
                            order_item_id: it.order_item_id,
                          });
                        }}
                        disabled={order.status !== 'cart'}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell colSpan={4} align="right" sx={{ fontWeight: 600, borderBottom: 'none' }}>
                Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, borderBottom: 'none' }}>
                ${total.toFixed(2)}
              </TableCell>
              <TableCell sx={{ borderBottom: 'none' }} />
            </TableRow>
          </TableBody>
        </Table>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {order.status === 'cart' && (
            <Button
              variant="contained"
              onClick={() =>
                updateStatusMut.mutate({ order_id: order.order_id, status: 'pending' })
              }
            >
              Submit Order
            </Button>
          )}
          {order.status === 'pending' && (
            <Button
              variant="outlined"
              onClick={() =>
                updateStatusMut.mutate({ order_id: order.order_id, status: 'delivered' })
              }
            >
              Mark Delivered
            </Button>
          )}
        </Stack>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.default' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4">Purchase Orders</Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage supplier purchase orders
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunFreshReorderPreview}
            disabled={generateMut.isPending}
            sx={{ px: 3, py: 1.5, borderRadius: 2 }}
          >
            {generateMut.isPending ? 'Running Preview...' : 'Run Reorder Preview'}
          </Button>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => setWizardOpen(true)}
            sx={{ px: 4, py: 1.5, borderRadius: 2, boxShadow: 3, '&:hover': { boxShadow: 6 } }}
          >
            New Order
          </Button>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Tabs
        value={status}
        onChange={(_, v) => {
          setStatus(v);
          setSelectedOrder(null);
        }}
        sx={{ mb: 2 }}
      >
        {statusTabs.map(t => (
          <Tab
            key={t.value}
            value={t.value}
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>{t.label}</span>
                <Chip size="small" label={orderCountsByStatus[t.value]} sx={{ height: 20 }} />
              </Stack>
            }
          />
        ))}
      </Tabs>

      {/* Order List & Detail */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper
          sx={{
            p: 2,
            width: { xs: '100%', md: 360 },
            flexShrink: 0,
            bgcolor: 'background.paper',
            maxHeight: 600,
            overflow: 'auto',
          }}
          elevation={0}
        >
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Orders ({orders.length})
          </Typography>
          <Divider sx={{ mb: 1 }} />
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : orders.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No {status} orders
            </Typography>
          ) : (
            <Stack spacing={1}>
              {groupedBySupplier.map(([supplier, list]) => (
                <Box key={supplier}>
                  <Typography variant="caption" color="text.secondary">
                    {supplier} • {list.length}
                  </Typography>
                  <Stack spacing={0.5}>
                    {list.map(po => (
                      <Button
                        key={po.order_id}
                        variant={selectedOrder?.order_id === po.order_id ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setSelectedOrder(po)}
                        sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      >
                        <Box>
                          <Typography variant="body2">
                            #{po.order_id} • {dayjs(po.order_date).format('MMM D')}
                          </Typography>
                          <Typography variant="caption">
                            ${po.total_order_price.toFixed(2)}
                          </Typography>
                        </Box>
                      </Button>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper sx={{ p: 2, flex: 1, bgcolor: 'background.paper' }} elevation={0}>
          {selectedOrder ? (
            <ItemEditor order={selectedOrder} />
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                color: 'text.secondary',
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body1">Select an order to view and edit items</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Or click <strong>New Order</strong> to create one
              </Typography>
            </Box>
          )}
        </Paper>
      </Stack>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Wizard Dialog */}
      <Dialog
        open={wizardOpen}
        onClose={closeWizard}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: 620 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <ShoppingCartIcon color="primary" />
              <Box>
                <Typography variant="h6">New Purchase Order</Typography>
                <Typography variant="body2" color="text.secondary">
                  Build the order on the left and keep the live draft anchored on the right.
                </Typography>
              </Box>
            </Stack>
            {wizardMode && wizardStep === 1 && (
              <Chip
                color={wizardMode === 'supplier' ? 'primary' : 'secondary'}
                variant="outlined"
                label={wizardMode === 'supplier' ? 'Supplier Builder' : 'Ingredient Builder'}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            minHeight: 460,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {wizardStep === 0 ? (
            renderWizardMainContent()
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.55fr) minmax(320px, 0.95fr)' },
                gap: 2,
                flex: 1,
                minHeight: 0,
              }}
            >
              <Box sx={{ minWidth: 0 }}>{renderWizardMainContent()}</Box>
              <Box sx={{ minWidth: 0 }}>{renderBuilderSidebar()}</Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeWizard}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          {wizardStep > 0 && (
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Change Method
            </Button>
          )}
          {wizardStep === 0 ? (
            <Button variant="contained" onClick={handleNext} disabled={!canProceed()}>
              Continue
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={
                createFromSuggestionsMut.isPending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <CheckCircleIcon />
                )
              }
              onClick={handleCreate}
              disabled={
                !canProceed() || (wizardMode === 'supplier' && createFromSuggestionsMut.isPending)
              }
            >
              {wizardMode === 'supplier'
                ? createFromSuggestionsMut.isPending
                  ? 'Creating...'
                  : `Create ${reviewTotals.supplierCount} Draft(s)`
                : `Create ${ingredientCartTotals.supplierCount || 1} Draft${ingredientCartTotals.supplierCount === 1 ? '' : 's'}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
