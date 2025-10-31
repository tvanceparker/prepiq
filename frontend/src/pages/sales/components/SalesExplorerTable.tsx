import React, { useState, useMemo, useEffect } from 'react';
import type { AlertColor } from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { Snackbar, Alert, Autocomplete, TextField, Popper, Paper, Tooltip } from '@mui/material';
import Button from '../../../components/Button';

export default function SalesExplorerTable({
  data = [],
  loading,
  updateSaleRecord,
  menuItems = [],
  salesChannels = [], // new prop from parent for sales channels options
}) {
  const [tableData, setTableData] = useState(data);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const [editingRowId, setEditingRowId] = useState(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editChannel, setEditChannel] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [data]);

  const columns = useMemo(
    () => [
      {
        header: 'Date',
        accessorKey: 'sale_timestamp',
        enableSorting: true,
        Cell: ({ cell }) => new Date(cell.getValue()).toLocaleString(),
      },
      {
        header: 'Menu Item',
        accessorKey: 'menu_item_name',
        enableSorting: true,
        Cell: ({ row }) => row.original.menu_item_name || '',
      },
      {
        header: 'Quantity',
        accessorKey: 'quantity_sold',
        enableSorting: true,
        Cell: ({ row }) => row.original.quantity_sold,
      },
      {
        header: 'Channel',
        accessorKey: 'sales_channel',
        enableSorting: true,
        Cell: ({ row }) => row.original.sales_channel || '',
      },
      {
        header: 'Revenue',
        accessorKey: 'revenue',
        enableSorting: true,
        Cell: ({ cell }) => `$${cell.getValue().toFixed(2)}`,
      },
    ],
    []
  );

  // Handle edit button click: open popper and set values
  const handleEditClick = (event, row) => {
    setEditingRowId(row.original.sale_id);
    setEditQuantity(row.original.quantity_sold);
    setEditChannel(row.original.sales_channel);
    setAnchorEl(event.currentTarget);
  };

  // Handle save from popper
  const handleSave = async () => {
    if (!editingRowId) return;

    setActionLoading(true);
    try {
      // Find the original row data to get required fields
      const originalRow = tableData.find(item => item.sale_id === editingRowId);

      const payload = {
        sale_timestamp: originalRow.sale_timestamp, // add this
        menu_item_id: originalRow.menu_item_id, // add this
        quantity_sold: Number(editQuantity),
        sales_channel: editChannel,
      };

      await updateSaleRecord(editingRowId, payload);

      setTableData(prev =>
        prev.map(item => (item.sale_id === editingRowId ? { ...item, ...payload } : item))
      );

      setSnackbar({
        open: true,
        message: 'Sale updated successfully!',
        severity: 'success',
      });
      setEditingRowId(null);
      setAnchorEl(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Update failed: ${error.message}`,
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingRowId(null);
    setAnchorEl(null);
  };

  return (
    <>
      <MaterialReactTable
        columns={columns}
        data={tableData}
        enableEditing={false} // Disable modal editing
        enableRowActions={true}
        state={{ isLoading: loading || actionLoading, pagination }}
        onPaginationChange={setPagination}
        initialState={{ pagination: { pageIndex: 0, pageSize: 20 } }}
        muiTableContainerProps={{ sx: { maxHeight: 400 } }}
        muiTableHeadProps={{
          sx: {
            position: 'sticky',
            top: 0,
            backgroundColor: 'background.paper',
            zIndex: 10,
          },
        }}
        localization={{ noRecordsToDisplay: 'No sales data available.' }}
        renderRowActions={({ row }) => (
          <Tooltip title="Edit Sale">
            <span>
              <Button
                variant="edit" // your custom variant to get the pencil icon + color
                muiVariant="outlined" // underlying MUI Button uses outlined style
                iconOnly={true} // icon only, no text
                requiredPermission="sales"
                onClick={e => handleEditClick(e, row)}
                sx={{ minWidth: 0, padding: '6px 8px' }}
                aria-label={`Edit sale ${row.original.sale_id}`}
              />
            </span>
          </Tooltip>
        )}
      />

      {/* Popper form for editing quantity and sales channel */}
      <Popper
        open={Boolean(editingRowId)}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            minWidth: 300,
          }}
        >
          <TextField
            label="Quantity"
            type="number"
            size="small"
            inputProps={{ min: 0 }}
            value={editQuantity}
            onChange={e => setEditQuantity(e.target.value)}
          />
          <Autocomplete
            options={salesChannels}
            size="small"
            value={editChannel}
            onChange={(_e, newVal) => setEditChannel(newVal || '')}
            renderInput={params => <TextField {...params} label="Sales Channel" />}
            sx={{ width: 180 }}
            disableClearable
          />
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={actionLoading}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Save
          </Button>
          <Button onClick={handleCancel} sx={{ whiteSpace: 'nowrap' }}>
            Cancel
          </Button>
        </Paper>
      </Popper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
