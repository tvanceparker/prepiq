import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from "@mui/material";

const SupplierDialog = ({ open, onClose, supplier, setSupplier, onSave }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {supplier.supplier_id ? "Edit Supplier" : "Add Supplier"}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Name"
          fullWidth
          margin="dense"
          value={supplier.name || ""}
          onChange={(e) => setSupplier({ ...supplier, name: e.target.value })}
        />
        <TextField
          label="Type"
          fullWidth
          margin="dense"
          value={supplier.type || ""}
          onChange={(e) => setSupplier({ ...supplier, type: e.target.value })}
        />
        <TextField
          label="Region"
          fullWidth
          margin="dense"
          value={supplier.region || ""}
          onChange={(e) => setSupplier({ ...supplier, region: e.target.value })}
        />
        <TextField
          label="Contact Info"
          fullWidth
          margin="dense"
          value={supplier.contact_info || ""}
          onChange={(e) =>
            setSupplier({ ...supplier, contact_info: e.target.value })
          }
        />
        <TextField
          label="Rating"
          type="number"
          inputProps={{ step: "0.01", min: 0, max: 5 }}
          fullWidth
          margin="dense"
          value={supplier.rating ?? 5}
          onChange={(e) =>
            setSupplier({ ...supplier, rating: parseFloat(e.target.value) })
          }
        />
        <TextField
          label="Website"
          fullWidth
          margin="dense"
          value={supplier.website || ""}
          onChange={(e) =>
            setSupplier({ ...supplier, website: e.target.value })
          }
        />
        <FormControl fullWidth margin="dense">
          <InputLabel id="contract-status-label">Contract Status</InputLabel>
          <Select
            labelId="contract-status-label"
            value={supplier.contract_status || ""}
            label="Contract Status"
            onChange={(e) =>
              setSupplier({ ...supplier, contract_status: e.target.value })
            }
          >
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Expired">Expired</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Terminated">Terminated</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Contract Start Date"
          type="date"
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
          value={supplier.contract_start_date || ""}
          onChange={(e) =>
            setSupplier({ ...supplier, contract_start_date: e.target.value })
          }
        />
        <TextField
          label="Contract End Date"
          type="date"
          fullWidth
          margin="dense"
          InputLabelProps={{ shrink: true }}
          value={supplier.contract_end_date || ""}
          onChange={(e) =>
            setSupplier({ ...supplier, contract_end_date: e.target.value })
          }
        />
        <TextField
          label="Supplier Feedback"
          multiline
          rows={3}
          fullWidth
          margin="dense"
          value={supplier.supplier_feedback || ""}
          onChange={(e) =>
            setSupplier({ ...supplier, supplier_feedback: e.target.value })
          }
        />
        <FormControlLabel
          control={
            <Switch
              checked={supplier.is_active ?? true}
              onChange={(e) =>
                setSupplier({ ...supplier, is_active: e.target.checked })
              }
            />
          }
          label="Is Active"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SupplierDialog;
