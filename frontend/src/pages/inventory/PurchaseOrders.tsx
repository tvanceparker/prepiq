import React, { useMemo, useState } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  addItemToPurchaseOrder,
  removeItemFromPurchaseOrder,
  updatePurchaseOrderStatus,
  getSuppliersList,
  getIngredientNames,
} from '../../api/inventory';
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderCreate,
  PurchaseOrderStatus,
  IngredientName,
} from '../../interfaces/inventory';

const statusTabs: { label: string; value: PurchaseOrderStatus }[] = [
  { label: 'Drafts', value: 'cart' },
  { label: 'Pending', value: 'pending' },
  { label: 'Delivered', value: 'delivered' },
];

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PurchaseOrderStatus>('cart');
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [newOrderSupplier, setNewOrderSupplier] = useState<any | null>(null);
  const [newOrderDate, setNewOrderDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showToast = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'success'
  ) => setSnackbar({ open: true, message, severity });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliersList,
  });

  const { data: ingredientNames = [] } = useQuery<IngredientName[]>({
    queryKey: ['ingredient_names'],
    queryFn: getIngredientNames,
  });

  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchase_orders', status],
    queryFn: () => getPurchaseOrders({ status }),
  });

  const createOrderMut = useMutation({
    mutationFn: (payload: PurchaseOrderCreate) => createPurchaseOrder(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      showToast('Draft order created.');
      setNewOrderOpen(false);
    },
  });

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

  const groupedBySupplier = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    (orders || []).forEach(po => {
      const key = po.supplier_name || `Supplier ${po.supplier_id}`;
      const arr = map.get(key) || [];
      arr.push(po);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [orders]);

  const handleCreateOrder = () => {
    if (!newOrderSupplier) {
      showToast('Select a supplier.', 'warning');
      return;
    }
    const payload: PurchaseOrderCreate = {
      supplier_id: Number(
        newOrderSupplier?.supplier_id ?? newOrderSupplier?.id ?? newOrderSupplier?.value
      ),
      expected_delivery_date: newOrderDate,
      items: [],
      notes: undefined,
    };
    createOrderMut.mutate(payload);
  };

  const IngredientAutocomplete: React.FC<{
    value: IngredientName | null;
    onChange: (v: IngredientName | null) => void;
  }> = ({ value, onChange }) => (
    <Autocomplete
      options={ingredientNames}
      getOptionLabel={opt => opt.ingredient_name}
      value={value}
      onChange={(_, v) => onChange(v)}
      renderInput={params => <TextField {...params} label="Ingredient" size="small" />}
      sx={{ minWidth: 240 }}
    />
  );

  const ItemEditor: React.FC<{ order: PurchaseOrder }> = ({ order }) => {
    const [selIngredient, setSelIngredient] = useState<IngredientName | null>(null);
    const [qty, setQty] = useState<string>('');
    const [unit, setUnit] = useState<string>('unit');
    const [price, setPrice] = useState<string>('');

    const addItem = () => {
      const q = Number(qty);
      const p = Number(price);
      if (!selIngredient || isNaN(q) || isNaN(p)) {
        showToast('Fill ingredient, quantity and price.', 'warning');
        return;
      }
      addItemMut.mutate({
        order_id: order.order_id,
        item: {
          ingredient_id: selIngredient.ingredient_id,
          quantity_ordered: q,
          unit,
          unit_price: p,
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
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <IngredientAutocomplete value={selIngredient} onChange={setSelIngredient} />
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
              <TableCell
                colSpan={4}
                align="right"
                sx={{
                  fontWeight: 600,
                  borderBottom: 'none',
                }}
              >
                Total
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  borderBottom: 'none',
                }}
              >
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
      <Typography variant="h4" sx={{ mb: 1 }}>
        Purchase Orders
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Create and manage supplier purchase orders. Drafts can be saved and continued later.
      </Typography>

      <Tabs
        value={status}
        onChange={(_, v) => {
          setStatus(v);
          setSelectedOrder(null);
        }}
        sx={{ mb: 2 }}
      >
        {statusTabs.map(t => (
          <Tab key={t.value} value={t.value} label={t.label} />
        ))}
      </Tabs>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Paper
          sx={{
            p: 2,
            width: { xs: '100%', md: 360 },
            flexShrink: 0,
            bgcolor: 'background.paper',
          }}
          elevation={0}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Orders ({orders.length})</Typography>
            <Button size="small" variant="contained" onClick={() => setNewOrderOpen(true)}>
              New Order
            </Button>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {isLoading ? (
            <Typography variant="body2">Loading…</Typography>
          ) : (
            <Stack spacing={1}>
              {groupedBySupplier.map(([supplier, list]) => (
                <Box key={supplier}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {supplier} • {list.length}
                  </Typography>
                  <Stack spacing={0.5}>
                    {list.map(po => (
                      <Button
                        key={po.order_id}
                        variant={selectedOrder?.order_id === po.order_id ? 'contained' : 'text'}
                        size="small"
                        onClick={() => setSelectedOrder(po)}
                        sx={{
                          justifyContent: 'flex-start',
                          ...(selectedOrder?.order_id !== po.order_id && {
                            color: 'text.primary',
                          }),
                        }}
                      >
                        #{po.order_id} • {dayjs(po.order_date).format('MMM D')} • $
                        {po.total_order_price.toFixed(2)}
                      </Button>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        <Paper
          sx={{
            p: 2,
            flex: 1,
            bgcolor: 'background.paper',
          }}
          elevation={0}
        >
          {selectedOrder ? (
            <ItemEditor order={selectedOrder} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select an order to view and edit items.
            </Typography>
          )}
        </Paper>
      </Stack>

      <Dialog open={newOrderOpen} onClose={() => setNewOrderOpen(false)}>
        <DialogTitle>Start New Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
            <Autocomplete
              options={suppliers}
              getOptionLabel={(opt: any) =>
                opt?.name || opt?.supplier_name || `Supplier ${opt?.supplier_id || opt?.id || ''}`
              }
              value={newOrderSupplier}
              onChange={(_, v) => setNewOrderSupplier(v)}
              renderInput={params => <TextField {...params} label="Supplier" />}
            />
            <TextField
              label="Expected Delivery Date"
              type="date"
              value={newOrderDate}
              onChange={e => setNewOrderDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOrderOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={createOrderMut.isPending}
          >
            Create Draft
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
