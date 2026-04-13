import React, { useEffect, useState } from 'react';
import type { AlertColor } from '@mui/material';
import {
  Box,
  Stack,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Tooltip,
  DialogActions,
  TextField,
  Autocomplete,
  Paper,
} from '@mui/material';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import SalesExplorerTable from './SalesExplorerTable';
import { useSalesExplorer } from '../hooks/useSalesExplorer';
import DateSelector from '../../../components/DateSelector';
import { PageHeader } from '../../../components/PageHeader';
import Button from '../../../components/Button';

export default function SalesExplorerBasic() {
  // Destructure necessary data and methods from your custom hook
  const {
    data,
    menuItems,
    salesChannels,
    loading,
    error,
    filters: { startDate, setStartDate, endDate, setEndDate },
    downloadExcel,
    createSaleRecord,
    updateSaleRecord,
  } = useSalesExplorer();

  // Snackbar for feedback messages
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Dialog open state
  const [openDialog, setOpenDialog] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    menu_item: null,
    sale_timestamp: new Date().toISOString().slice(0, 16), // datetime-local format
    quantity_sold: 1,
    sales_channel: '',
    revenue: 0,
  });

  // Handler for form input changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Open dialog
  const handleOpenDialog = () => setOpenDialog(true);
  // Close dialog
  const handleCloseDialog = () => setOpenDialog(false);

  // Submit new sale record
  const handleSubmit = async () => {
    // Validate required fields
    if (
      !formData.menu_item ||
      !formData.sale_timestamp ||
      !formData.quantity_sold ||
      !formData.sales_channel
    ) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    const payload = {
      menu_item_id: formData.menu_item.menu_item_id,
      sale_timestamp: new Date(formData.sale_timestamp).toISOString(),
      quantity_sold: Number(formData.quantity_sold),
      sales_channel: formData.sales_channel,
      revenue: Number(formData.revenue),
    };

    try {
      await createSaleRecord(payload);
      setSnackbar({
        open: true,
        message: 'Sale created successfully',
        severity: 'success',
      });
      setOpenDialog(false);
      // Reset form data
      setFormData({
        menu_item: null,
        sale_timestamp: new Date().toISOString().slice(0, 16),
        quantity_sold: 1,
        sales_channel: '',
        revenue: 0,
      });
    } catch (e) {
      setSnackbar({
        open: true,
        message: `Failed to create sale: ${e.message || e}`,
        severity: 'error',
      });
    }
  };

  // Close snackbar handler
  const handleCloseSnackbar = (_event: any, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Initialize default date range if none set
  useEffect(() => {
    if (!startDate && !endDate) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 1);

      setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
      setEndDate(yesterday.toISOString().split('T')[0]);
    }
  }, [startDate, endDate, setStartDate, setEndDate]);

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          typography: 'body1',
        }}
      >
        Loading...
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'error.main',
          typography: 'body1',
        }}
      >
        Error: {error.toString()}
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      <PageHeader
        eyebrow="Sales review workspace"
        title="Sales Explorer"
        description="Inspect sales records, filter by date, and make controlled manual corrections without losing context around the underlying data set."
        icon={<ManageSearchOutlinedIcon />}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        mb={6}
        width="100%"
      >
        {/* Date Range Selector */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <DateSelector
            label="Select Date Range"
            startDate={new Date(startDate)}
            endDate={new Date(endDate)}
            onStartDateChange={date => setStartDate(date.toISOString().slice(0, 10))}
            onEndDateChange={date => setEndDate(date.toISOString().slice(0, 10))}
            mode="range"
            direction="backward"
          />
        </Box>

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            onClick={handleOpenDialog}
            variant="confirm"
            showIcon={false}
            requiredPermission="sales"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Create New Sale
          </Button>

          <Tooltip title="Download to Excel">
            <span>
              <Button
                onClick={downloadExcel}
                iconOnly={true}
                disabled={!startDate || !endDate}
                variant="file"
                sx={{ whiteSpace: 'nowrap' }}
              >
                Download Excel
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Sales Data Table */}
      <SalesExplorerTable
        data={data}
        loading={loading}
        updateSaleRecord={updateSaleRecord}
        salesChannels={salesChannels}
      />

      {/* Create Sale Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Sale</DialogTitle>
        <DialogContent dividers>
          {/* Menu Item Selector */}
          <Autocomplete
            options={menuItems}
            getOptionLabel={option => option.name}
            value={formData.menu_item}
            onChange={(_e, newValue) => handleFormChange('menu_item', newValue)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={params => (
              <TextField {...params} label="Menu Item" margin="normal" required fullWidth />
            )}
            fullWidth
          />

          {/* Sale Timestamp */}
          <TextField
            label="Sale Timestamp"
            type="datetime-local"
            fullWidth
            margin="normal"
            required
            value={formData.sale_timestamp}
            onChange={e => handleFormChange('sale_timestamp', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {/* Quantity Sold */}
          <TextField
            label="Quantity Sold"
            type="number"
            fullWidth
            margin="normal"
            required
            inputProps={{ min: 1 }}
            value={formData.quantity_sold}
            onChange={e => handleFormChange('quantity_sold', e.target.value)}
          />

          {/* Sales Channel Autocomplete */}
          <Autocomplete
            options={salesChannels || []}
            value={formData.sales_channel || null}
            onChange={(_e, newValue) => handleFormChange('sales_channel', newValue || '')}
            renderInput={params => (
              <TextField
                {...params}
                label="Sales Channel"
                margin="normal"
                required
                placeholder="Select a sales channel"
                fullWidth
              />
            )}
            fullWidth
            disableClearable
            getOptionLabel={option => option}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
