import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getPurchaseOrderDetail,
  // updatePurchaseOrderStatus,
  // addItemToPurchaseOrder,
  // removeItemFromPurchaseOrder,
} from '../../api/inventory';
import { PurchaseOrder } from '../../interfaces/inventory';
import PurchaseOrderModal from './components/PurchaseOrderModal';
import AddIcon from '@mui/icons-material/Add';

const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPurchaseOrders()
      .then(setOrders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openOrder = async (order_id: number) => {
    setLoading(true);
    try {
      const detail = await getPurchaseOrderDetail(order_id);
      setSelectedOrder(detail);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ... UI for listing, creating, and viewing purchase orders ...
  // For brevity, this is a stub. You can expand with full MUI Table, Dialogs, and forms as needed.

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      {loading && (
        <Typography color="primary" sx={{ mb: 2 }}>
          Loading...
        </Typography>
      )}
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      <Typography variant="h4" gutterBottom>
        Purchase Orders
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setShowNewDialog(true)}
        sx={{ mb: 2 }}
      >
        New Purchase Order
      </Button>
      {/* Table of purchase orders */}
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Total ($)</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map(order => (
              <TableRow
                key={order.order_id}
                hover
                onClick={() => openOrder(order.order_id)}
                style={{ cursor: 'pointer' }}
              >
                <TableCell>{order.order_id}</TableCell>
                <TableCell>{order.supplier_name}</TableCell>
                <TableCell>
                  <Chip
                    label={order.status}
                    color={
                      order.status === 'delivered'
                        ? 'success'
                        : order.status === 'pending'
                          ? 'warning'
                          : 'default'
                    }
                  />
                </TableCell>
                <TableCell>{order.order_date}</TableCell>
                <TableCell>{order.total_order_price.toFixed(2)}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      openOrder(order.order_id);
                    }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {/* Dialogs for new PO and details would go here */}
      <PurchaseOrderModal
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onSubmit={async po => {
          setLoading(true);
          try {
            await createPurchaseOrder(po);
            const updated = await getPurchaseOrders();
            setOrders(updated);
            setShowNewDialog(false);
          } catch (e: any) {
            setError(e.message);
          } finally {
            setLoading(false);
          }
        }}
      />
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        <DialogTitle>Purchase Order Details</DialogTitle>
        <DialogContent>
          {selectedOrder ? (
            <>
              <Typography variant="subtitle1">Supplier: {selectedOrder.supplier_name}</Typography>
              <Typography variant="subtitle2">Status: {selectedOrder.status}</Typography>
              <Typography variant="body2">Order Date: {selectedOrder.order_date}</Typography>
              <Typography variant="body2">
                Expected Delivery: {selectedOrder.expected_delivery_date || '-'}
              </Typography>
              <Table size="small" sx={{ mt: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Ingredient</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Unit</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedOrder.items.map(item => (
                    <TableRow key={item.order_item_id}>
                      <TableCell>{item.ingredient_name}</TableCell>
                      <TableCell>{item.quantity_ordered}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell>{item.total_item_price.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PurchaseOrdersPage;
