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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  addItemToPurchaseOrder,
  removeItemFromPurchaseOrder,
  updatePurchaseOrderStatus,
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
  POIngredientReview,
  WizardMode,
} from './components/po-wizard';

const statusTabs: { label: string; value: PurchaseOrderStatus }[] = [
  { label: 'Drafts', value: 'cart' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'delivered' },
];

type WizardStep = 0 | 1 | 2;
const WIZARD_STEPS = ['Choose Method', 'Select Items', 'Review & Create'];

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

  // Queries
  const { data: ingredientNames = [] } = useQuery<IngredientName[]>({
    queryKey: ['ingredient_names'],
    queryFn: getIngredientNames,
  });

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders', status],
    queryFn: () => getPurchaseOrders({ status }),
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

  const updateStatusMut = useMutation({
    mutationFn: (args: { order_id: number; status: PurchaseOrderStatus }) =>
      updatePurchaseOrderStatus(args.order_id, args.status),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      setSelectedOrder(null);
      showToast('Order status updated.');
    },
  });

  const generateMut = useMutation({
    mutationFn: () => generatePOSuggestions(horizonDays, useCachedForecast),
    onSuccess: (data: POSuggestionsResponse) => {
      setSuggestions(data);
      const allItems = new Map<string, number>();
      data.all_items.forEach(item => {
        allItems.set(`${item.supplier_id}-${item.ingredient_id}`, item.quantity_to_order);
      });
      setSelectedItems(allItems);
      setExpandedSuppliers(new Set(data.suggestions.map(s => s.supplier_id)));
      setWizardStep(2);
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
    setOrderNotes('');
  }, []);

  const handleCreateIngredientOrder = async () => {
    if (!selectedIngredient || !ingredientSupplier) return;
    const payload: PurchaseOrderCreate = {
      supplier_id: ingredientSupplier.supplier_id,
      expected_delivery_date: dayjs()
        .add(ingredientSupplier.lead_time_days, 'day')
        .format('YYYY-MM-DD'),
      items: [
        {
          ingredient_id: selectedIngredient.ingredient_id,
          quantity_ordered: ingredientQty * ingredientSupplier.pack_size,
          unit: ingredientSupplier.pack_unit,
          unit_price: ingredientSupplier.unit_price,
        },
      ],
      notes: orderNotes || undefined,
    };
    try {
      await createPurchaseOrder(payload);
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      showToast('Draft order created!');
      closeWizard();
      setStatus('cart');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to create order', 'error');
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

  // Order list grouping
  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    orders.forEach(po => {
      const key = po.supplier_name || `Supplier ${po.supplier_id}`;
      map.set(key, [...(map.get(key) || []), po]);
    });
    return Array.from(map.entries());
  }, [orders]);

  // Navigation helpers
  const canProceed = () => {
    if (wizardStep === 0) return wizardMode !== null;
    if (wizardStep === 1 && wizardMode === 'ingredient')
      return selectedIngredient && ingredientSupplier;
    if (wizardStep === 2) {
      if (wizardMode === 'supplier') return selectedItems.size > 0;
      return selectedIngredient && ingredientSupplier;
    }
    return true;
  };

  const handleNext = () => {
    if (wizardStep === 0) setWizardStep(1);
    else if (wizardStep === 1 && wizardMode === 'ingredient') setWizardStep(2);
  };

  const handleBack = () => {
    if (wizardStep === 1) {
      setWizardStep(0);
      setSuggestions(null);
    } else if (wizardStep === 2) {
      if (wizardMode === 'supplier') setSuggestions(null);
      setWizardStep(1);
    }
  };

  const handleCreate = () => {
    if (wizardMode === 'supplier') createFromSuggestionsMut.mutate();
    else handleCreateIngredientOrder();
  };

  // Wizard content
  const renderWizardContent = () => {
    if (wizardStep === 0) {
      return <POMethodSelector selectedMode={wizardMode} onSelectMode={setWizardMode} />;
    }
    if (wizardMode === 'supplier') {
      if (wizardStep === 1) {
        return (
          <POSupplierConfig
            useCachedForecast={useCachedForecast}
            setUseCachedForecast={setUseCachedForecast}
            horizonDays={horizonDays}
            setHorizonDays={setHorizonDays}
            lastEodDate={lastEodData?.last_eod_run_date}
            onGenerate={() => generateMut.mutate()}
            isGenerating={generateMut.isPending}
          />
        );
      }
      if (wizardStep === 2 && suggestions) {
        return (
          <POSupplierReview
            suggestions={suggestions}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            expandedSuppliers={expandedSuppliers}
            setExpandedSuppliers={setExpandedSuppliers}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
          />
        );
      }
    }
    if (wizardMode === 'ingredient') {
      if (wizardStep === 1) {
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
          />
        );
      }
      if (wizardStep === 2 && selectedIngredient && ingredientSupplier) {
        return (
          <POIngredientReview
            selectedIngredient={selectedIngredient}
            ingredientSupplier={ingredientSupplier}
            ingredientQty={ingredientQty}
            orderNotes={orderNotes}
            setOrderNotes={setOrderNotes}
          />
        );
      }
    }
    return null;
  };

  // Item Editor Component
  const ItemEditor = ({ order }: { order: PurchaseOrder }) => {
    const [selIngredient, setSelIngredient] = useState<IngredientName | null>(null);
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState('unit');
    const [price, setPrice] = useState('');

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
            {(order.items || []).map(it => (
              <TableRow key={it.order_item_id}>
                <TableCell>{it.ingredient_name}</TableCell>
                <TableCell align="right">{it.quantity_ordered}</TableCell>
                <TableCell>{it.unit}</TableCell>
                <TableCell align="right">${Number(it.unit_price).toFixed(2)}</TableCell>
                <TableCell align="right">${Number(it.total_item_price).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() =>
                      removeItemMut.mutate({
                        order_id: order.order_id,
                        order_item_id: it.order_item_id,
                      })
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
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
                <Chip
                  size="small"
                  label={orders.filter(o => o.status === t.value).length}
                  sx={{ height: 20 }}
                />
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
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { minHeight: 500 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <ShoppingCartIcon color="primary" />
            <Typography variant="h6">New Purchase Order</Typography>
          </Stack>
        </DialogTitle>

        <Box sx={{ px: 3, pb: 2 }}>
          <Stepper activeStep={wizardStep} alternativeLabel>
            {WIZARD_STEPS.map((label, index) => (
              <Step key={label} completed={wizardStep > index}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <DialogContent dividers sx={{ minHeight: 350 }}>
          {renderWizardContent()}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeWizard}>Cancel</Button>
          <Box sx={{ flex: 1 }} />
          {wizardStep > 0 && (
            <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
              Back
            </Button>
          )}
          {wizardStep < 2 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {wizardStep === 0 ? 'Continue' : wizardMode === 'supplier' ? 'Generate' : 'Continue'}
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
              disabled={!canProceed() || createFromSuggestionsMut.isPending}
            >
              {createFromSuggestionsMut.isPending
                ? 'Creating...'
                : wizardMode === 'supplier'
                  ? `Create ${reviewTotals.supplierCount} Draft(s)`
                  : 'Create Draft'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
