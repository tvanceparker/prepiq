import React, { useState, useCallback } from "react";
import {
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
} from "@mui/material";

const exampleSalesData = [
  {
    sale_timestamp: "2025-06-10 12:30",
    menu_item_id: "101",
    menu_item_name: "Cheeseburger",
    quantity_sold: "50",
    sales_channel: "In-House",
  },
  {
    sale_timestamp: "2025-06-10 13:15",
    menu_item_id: "102",
    menu_item_name: "Veggie Wrap",
    quantity_sold: "30",
    sales_channel: "Delivery",
  },
];

export default function SalesUploadModal({ isOpen, onClose, onUpload }) {
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [conflict, setConflict] = useState(false);

  const uploadFile = async (file, overwrite = false) => {
    try {
      await onUpload(file, overwrite);
      setPendingFile(null);
      setConflict(false);
      onClose();
    } catch (err) {
      if (err.message.includes("409")) {
        setPendingFile(file);
        setConflict(true);
      } else {
        console.error(err);
      }
    }
  };

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        await uploadFile(file, false);
      }
    },
    [onUpload]
  );

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFile(file, false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
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
            borderColor: dragOver ? "primary.main" : "grey.400",
            borderStyle: "dashed",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: conflict ? "default" : "pointer",
            bgcolor: dragOver ? "primary.light" : "transparent",
            mb: 3,
            userSelect: "none",
          }}
        >
          <Typography variant="body2" color="text.secondary" mb={1}>
            Drag and drop your sales CSV or XLSX file here, or click to select
            file
          </Typography>

          <input
            type="file"
            accept=".csv, .xlsx"
            id="sales-file-upload"
            onChange={handleChange}
            disabled={conflict}
            style={{ display: "none" }}
          />
          <label htmlFor="sales-file-upload">
            <Button variant="contained" component="span" disabled={conflict}>
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
            >
              Cancel
            </Button>
          </Box>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          mb={1}
        >
          CSV should include the following columns:
        </Typography>

        <Paper variant="outlined" sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small" aria-label="example sales data">
            <TableHead sx={{ bgcolor: "grey.100" }}>
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
                    bgcolor: i % 2 === 0 ? "background.paper" : "grey.50",
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
