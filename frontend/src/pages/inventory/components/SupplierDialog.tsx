import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

const SupplierDialog = ({ open, onClose, supplier, setSupplier, onSave }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <Box sx={{ px: 3, pt: 3, pb: 1.5 }}>
        <Typography variant="overline" color="text.secondary">
          Supplier record
        </Typography>
        <Typography variant="h5" fontWeight={800}>
          {supplier?.supplier_id ? 'Edit Supplier' : 'Add Supplier'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Capture the basic supplier identity first, then fill in contract and contact detail.
        </Typography>
      </Box>
      <DialogContent dividers>
        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Identity
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Name"
                    fullWidth
                    value={supplier?.name || ''}
                    onChange={e => setSupplier({ ...supplier, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Type"
                    fullWidth
                    value={supplier?.type || ''}
                    onChange={e => setSupplier({ ...supplier, type: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Region"
                    fullWidth
                    value={supplier?.region || ''}
                    onChange={e => setSupplier({ ...supplier, region: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <TextField
                    label="Contact info"
                    fullWidth
                    value={supplier?.contact_info || ''}
                    onChange={e => setSupplier({ ...supplier, contact_info: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Rating"
                    type="number"
                    inputProps={{ step: '0.01', min: 0, max: 5 }}
                    fullWidth
                    value={supplier?.rating ?? 5}
                    onChange={e => setSupplier({ ...supplier, rating: parseFloat(e.target.value) })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Website"
                    fullWidth
                    value={supplier?.website || ''}
                    onChange={e => setSupplier({ ...supplier, website: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Contract and status
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="contract-status-label">Contract Status</InputLabel>
                    <Select
                      labelId="contract-status-label"
                      value={supplier?.contract_status || ''}
                      label="Contract Status"
                      onChange={e => setSupplier({ ...supplier, contract_status: e.target.value })}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Expired">Expired</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Terminated">Terminated</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Contract Start Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={supplier?.contract_start_date || ''}
                    onChange={e =>
                      setSupplier({ ...supplier, contract_start_date: e.target.value })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Contract End Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={supplier?.contract_end_date || ''}
                    onChange={e => setSupplier({ ...supplier, contract_end_date: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={supplier?.is_active ?? true}
                        onChange={e => setSupplier({ ...supplier, is_active: e.target.checked })}
                      />
                    }
                    label={
                      (supplier?.is_active ?? true) ? 'Supplier is active' : 'Supplier is inactive'
                    }
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Notes
              </Typography>
              <TextField
                label="Supplier Feedback"
                multiline
                rows={4}
                fullWidth
                value={supplier?.supplier_feedback || ''}
                onChange={e => setSupplier({ ...supplier, supplier_feedback: e.target.value })}
              />
            </Paper>
          </Grid>
        </Grid>
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
