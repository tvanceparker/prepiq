import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
} from '@mui/material';

const exampleSalesData = [
  {
    sale_timestamp: '2025-06-10 12:30',
    menu_item_id: '101',
    menu_item_name: 'Cheeseburger',
    quantity_sold: '50',
    sales_channel: 'In-House',
  },
  {
    sale_timestamp: '2025-06-10 13:15',
    menu_item_id: '102',
    menu_item_name: 'Veggie Wrap',
    quantity_sold: '30',
    sales_channel: 'Delivery',
  },
];

const formatChannelLabel = value => {
  if (value === null || value === undefined || value === '') {
    return 'Unspecified';
  }

  return String(value);
};

const formatRowData = rowData => {
  if (!rowData || typeof rowData !== 'object') {
    return '';
  }

  return Object.entries(rowData)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value === null ? 'null' : String(value)}`)
    .join(' | ');
};

export default function SalesUploadModal({
  isOpen,
  onClose,
  onUpload,
  onReset,
  result,
  uploadError,
  uploading,
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [conflict, setConflict] = useState(false);

  const hasWarnings =
    (result?.skipped_rows ?? 0) > 0 ||
    (result?.duplicate_rows ?? 0) > 0 ||
    (result?.row_errors?.length ?? 0) > 0 ||
    (result?.overwritten_rows ?? 0) > 0;

  useEffect(() => {
    if (!isOpen) {
      setDragOver(false);
      setPendingFile(null);
      setConflict(false);
    }
  }, [isOpen]);

  const handleReset = useCallback(() => {
    setPendingFile(null);
    setConflict(false);
    onReset?.();
  }, [onReset]);

  const uploadFile = async (file, overwrite = false) => {
    try {
      await onUpload(file, overwrite);
      setPendingFile(null);
      setConflict(false);
    } catch (err) {
      if (err.message.includes('409')) {
        setPendingFile(file);
        setConflict(true);
      } else {
        console.error(err);
      }
    }
  };

  const handleDrop = useCallback(
    async e => {
      e.preventDefault();
      setDragOver(false);
      if (conflict || uploading) {
        return;
      }

      const file = e.dataTransfer.files[0];
      if (file) {
        await uploadFile(file, false);
      }
    },
    [conflict, onUpload, uploading]
  );

  const handleChange = async e => {
    if (conflict || uploading) {
      return;
    }

    const file = e.target.files[0];
    if (file) {
      await uploadFile(file, false);
    }

    e.target.value = '';
  };

  const handleDragOver = e => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Upload Sales Data CSV or XLSX</DialogTitle>
      <DialogContent>
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            border: 2,
            borderColor: dragOver ? 'primary.main' : 'grey.400',
            borderStyle: 'dashed',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: conflict || uploading ? 'default' : 'pointer',
            bgcolor: dragOver ? 'primary.light' : 'transparent',
            mb: 3,
            userSelect: 'none',
          }}
        >
          <Typography variant="body2" color="text.secondary" mb={1}>
            Drag and drop your sales CSV or XLSX file here, or click to select file.
          </Typography>

          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            After upload, this dialog will show inserted counts, skipped rows, overwrite results,
            and row-level issues.
          </Typography>

          <input
            type="file"
            accept=".csv, .xlsx"
            id="sales-file-upload"
            onChange={handleChange}
            disabled={conflict || uploading}
            style={{ display: 'none' }}
          />
          <label htmlFor="sales-file-upload">
            <Button variant="contained" component="span" disabled={conflict || uploading}>
              {uploading ? 'Uploading...' : 'Select File'}
            </Button>
          </label>
        </Box>

        {conflict && (
          <Box textAlign="center" mb={3}>
            <Typography color="error" fontWeight="bold" mb={1}>
              Sales data already exists for this date.
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={() => uploadFile(pendingFile, true)}
              sx={{ mr: 1 }}
            >
              Overwrite Existing Sales Data
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setConflict(false);
                setPendingFile(null);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
          </Box>
        )}

        {uploadError && !conflict && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Upload failed: {uploadError.message}
          </Alert>
        )}

        {result && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Alert severity={hasWarnings ? 'warning' : 'success'} sx={{ mb: 2 }}>
              {result.message}
            </Alert>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(5, minmax(0, 1fr))',
                },
                gap: 1.5,
                mb: 2,
              }}
            >
              {[
                { label: 'Attempted', value: result.attempted_rows },
                { label: 'Inserted', value: result.inserted_rows },
                { label: 'Skipped', value: result.skipped_rows },
                { label: 'Duplicates', value: result.duplicate_rows },
                { label: 'Overwritten', value: result.overwritten_rows },
              ].map(item => (
                <Paper key={item.label} variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.label}
                  </Typography>
                  <Typography variant="h6">{item.value}</Typography>
                </Paper>
              ))}
            </Box>

            {(result.sale_dates?.length > 0 || result.channels?.length > 0) && (
              <Box sx={{ mb: 2 }}>
                {result.sale_dates?.length > 0 && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Dates: {result.sale_dates.join(', ')}
                  </Typography>
                )}
                {result.channels?.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Channels: {result.channels.map(formatChannelLabel).join(', ')}
                  </Typography>
                )}
              </Box>
            )}

            {(result.skipped_rows > 0 || result.duplicate_rows > 0) && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Skipped rows can include duplicates, blank quantity rows, zero quantities, and
                validation failures.
              </Typography>
            )}

            {(result.row_errors?.length ?? 0) > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Row-Level Issues
                </Typography>
                <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
                  <Table size="small" aria-label="sales upload errors">
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Row Data</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.row_errors.map(rowError => (
                        <TableRow key={`${rowError.row_number}-${rowError.code}`}>
                          <TableCell>{rowError.row_number}</TableCell>
                          <TableCell>{rowError.code}</TableCell>
                          <TableCell>{rowError.message}</TableCell>
                          <TableCell>{formatRowData(rowError.row_data)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </>
            )}
          </Paper>
        )}

        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          CSV should include the following columns:
        </Typography>

        <Paper variant="outlined" sx={{ width: '100%', overflowX: 'auto' }}>
          <Table size="small" aria-label="example sales data">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell>sale_timestamp</TableCell>
                <TableCell>menu_item_id</TableCell>
                <TableCell>menu_item_name</TableCell>
                <TableCell align="right">quantity_sold</TableCell>
                <TableCell>sales_channel</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {exampleSalesData.map((row, i) => (
                <TableRow
                  key={i}
                  sx={{
                    bgcolor: i % 2 === 0 ? 'background.paper' : 'grey.50',
                  }}
                >
                  <TableCell>{row.sale_timestamp}</TableCell>
                  <TableCell>{row.menu_item_id}</TableCell>
                  <TableCell>{row.menu_item_name}</TableCell>
                  <TableCell align="right">{row.quantity_sold}</TableCell>
                  <TableCell>{row.sales_channel}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </DialogContent>
      <DialogActions>
        {(result || uploadError) && (
          <Button onClick={handleReset} disabled={uploading}>
            Upload Another File
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
