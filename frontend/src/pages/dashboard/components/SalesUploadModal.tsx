import React, { useState, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Button from '../../../components/Button';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { useUploadSalesData } from '../hooks/useUploadSalesData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpload?: (file: File, overwrite?: boolean) => Promise<any>;
}

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

export default function SalesUploadModal({ isOpen, onClose, onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [conflict, setConflict] = useState(false);
  const { upload: internalUpload } = useUploadSalesData();

  const uploadFile = React.useCallback(
    async (file: File | null, overwrite = false) => {
      if (!file) return;
      try {
        const uploader = onUpload ?? internalUpload;
        await uploader(file, overwrite);
        setPendingFile(null);
        setConflict(false);
        onClose();
      } catch (err: any) {
        if (err?.message?.includes && err.message.includes('409')) {
          setPendingFile(file);
          setConflict(true);
        } else {
          console.error(err);
        }
      }
    },
    [onUpload, internalUpload, onClose]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) await uploadFile(f, false);
    },
    [onUpload]
  );

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) await uploadFile(f, false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
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
            cursor: conflict ? 'default' : 'pointer',
            bgcolor: dragOver ? 'primary.light' : 'transparent',
            mb: 3,
            userSelect: 'none',
          }}
        >
          <Typography variant="body2" color="text.secondary" mb={1}>
            Drag and drop your sales CSV or XLSX file here, or click to select file
          </Typography>

          <input
            type="file"
            accept=".csv,.xlsx"
            id="sales-file-upload"
            onChange={handleChange}
            disabled={conflict}
            style={{ display: 'none' }}
          />
          <label htmlFor="sales-file-upload">
            <Button variant="create" component="span" disabled={conflict}>
              Select File
            </Button>
          </label>
        </Box>

        {conflict && (
          <Box textAlign="center" mb={3}>
            <Typography color="error" fontWeight="bold" mb={1}>
              Sales data already exists for this date.
            </Typography>
            <Button
              variant="confirm"
              color="error"
              onClick={() => uploadFile(pendingFile, true)}
              sx={{ mr: 1 }}
            >
              Overwrite Existing Sales Data
            </Button>
            <Button
              variant="clear"
              onClick={() => {
                setConflict(false);
                setPendingFile(null);
              }}
            >
              Cancel
            </Button>
          </Box>
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
                <TableRow key={i} sx={{ bgcolor: i % 2 === 0 ? 'background.paper' : 'grey.50' }}>
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
