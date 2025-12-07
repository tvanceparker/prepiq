// src/pages/pos/components/OrdersBasic.tsx
import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem as MuiMenuItem,
} from '@mui/material';
import { Refresh as RefreshIcon, Receipt as ReceiptIcon } from '@mui/icons-material';
import { useOrders } from '../hooks/useOrders';
import { useDevice } from '../../../contexts/DeviceContext';
import OrderCard from './OrderCard';
import { TabPanelProps } from '../../../interfaces/pos';
import { Order } from '../../../interfaces/orders';

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const OrdersBasic: React.FC = () => {
  const { activeOrders, isLoading, error, updateOrderStatus, refreshOrders, updateOrder } =
    useOrders();
  const { device: deviceInfo } = useDevice();

  const [tabValue, setTabValue] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({
    status: 'pending',
    external_id: '',
    sales_channel: '',
    subtotal: '',
    tax: '',
    discount: '',
    total: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const openEdit = (order: Order) => {
    setEditingOrder(order);
    setForm({
      status: order.status || 'pending',
      external_id: order.external_id || '',
      sales_channel: order.sales_channel || '',
      subtotal: String(order.subtotal ?? ''),
      tax: String(order.tax ?? ''),
      discount: String(order.discount ?? ''),
      total: String(order.total ?? ''),
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingOrder(null);
  };

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    const payload: any = {
      status: form.status,
      external_id: form.external_id || undefined,
      sales_channel: form.sales_channel || undefined,
      subtotal: form.subtotal === '' ? undefined : parseFloat(form.subtotal),
      tax: form.tax === '' ? undefined : parseFloat(form.tax),
      discount: form.discount === '' ? undefined : parseFloat(form.discount),
      total: form.total === '' ? undefined : parseFloat(form.total),
    };
    await updateOrder(editingOrder.order_id, payload);
    closeEdit();
  };

  const getOrdersByStatus = (status: string) => {
    return (activeOrders || []).filter(order => (order?.status || '') === status);
  };

  const getAllOrders = () => {
    return [...(activeOrders || [])].sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'preparing':
        return 'primary';
      case 'ready':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (isLoading && (activeOrders || []).length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Order Management ({deviceInfo.type})</Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshOrders}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label={`All Orders (${(activeOrders || []).length})`} />
            <Tab label={`Pending (${getOrdersByStatus('pending').length})`} />
            <Tab
              label={`In Progress (${getOrdersByStatus('confirmed').length + getOrdersByStatus('preparing').length})`}
            />
            <Tab label={`Ready (${getOrdersByStatus('ready').length})`} />
            <Tab label={`Completed (${getOrdersByStatus('completed').length})`} />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(getAllOrders() || []).map(order => (
                    <TableRow key={order.order_id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <ReceiptIcon sx={{ mr: 1 }} />#{order.order_id}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status.toUpperCase()}
                          color={getStatusColor(order.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {Array.isArray(order.items) ? order.items.length : 0} items
                      </TableCell>
                      <TableCell>${order.total.toFixed(2)}</TableCell>
                      <TableCell>{formatDateTime(order.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => updateOrderStatus(order.order_id, 'completed')}
                          disabled={
                            (order?.status || '') === 'completed' ||
                            (order?.status || '') === 'cancelled'
                          }
                        >
                          Complete
                        </Button>
                        <Button
                          size="small"
                          sx={{ ml: 1 }}
                          variant="text"
                          onClick={() => openEdit(order)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={2}>
              {getOrdersByStatus('pending').map(order => (
                <Grid item xs={12} sm={6} md={4} key={order.order_id}>
                  <OrderCard order={order} onStatusUpdate={updateOrderStatus} />
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={2}>
              {[...getOrdersByStatus('confirmed'), ...getOrdersByStatus('preparing')].map(order => (
                <Grid item xs={12} sm={6} md={4} key={order.order_id}>
                  <OrderCard order={order} onStatusUpdate={updateOrderStatus} />
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={2}>
              {getOrdersByStatus('ready').map(order => (
                <Grid item xs={12} sm={6} md={4} key={order.order_id}>
                  <OrderCard order={order} onStatusUpdate={updateOrderStatus} />
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={2}>
              {getOrdersByStatus('completed')
                .slice(0, 20)
                .map(order => (
                  <Grid item xs={12} sm={6} md={4} key={order.order_id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">Order #{order.order_id}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {order.items.length} items • ${order.total.toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                          Completed: {formatDateTime(order.updated_at)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </TabPanel>
        </Paper>
      </Box>

      <Dialog open={editOpen} onClose={closeEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Status"
            select
            fullWidth
            value={form.status}
            onChange={e => handleFormChange('status', e.target.value)}
          >
            {['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'].map(opt => (
              <MuiMenuItem key={opt} value={opt}>
                {opt}
              </MuiMenuItem>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="External ID"
            fullWidth
            value={form.external_id}
            onChange={e => handleFormChange('external_id', e.target.value)}
          />
          <TextField
            margin="dense"
            label="Sales Channel"
            fullWidth
            value={form.sales_channel}
            onChange={e => handleFormChange('sales_channel', e.target.value)}
          />
          <Grid container spacing={2} mt={1}>
            <Grid item xs={6}>
              <TextField
                label="Subtotal"
                type="number"
                fullWidth
                value={form.subtotal}
                onChange={e => handleFormChange('subtotal', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Tax"
                type="number"
                fullWidth
                value={form.tax}
                onChange={e => handleFormChange('tax', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Discount"
                type="number"
                fullWidth
                value={form.discount}
                onChange={e => handleFormChange('discount', e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Total"
                type="number"
                fullWidth
                value={form.total}
                onChange={e => handleFormChange('total', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={isLoading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default OrdersBasic;
