import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import {
  TenantInfoUpdateRequest,
  DayHours,
  TenantModalProps,
} from "../../../interfaces/adminInterfaces";
import { tenantInfoSchema } from "../../../schemas/tenantSchema";
import { formatPhoneNumber } from "../../../forms/tenantFormHelpers";
import * as Yup from "yup";

export default function TenantModal({
  visible,
  onClose,
  onExited,
  onSave,
  initialData,
  confirmDelete,
  setConfirmDelete,
}: TenantModalProps) {
  // Form state is typed as TenantInfoUpdateRequest
  const [form, setForm] = useState<TenantInfoUpdateRequest>(initialData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible && initialData) {
      setForm(initialData);
      setErrors({});
    }
  }, [visible, initialData]);

  // Handle changes on string fields (name, phone, email, address, etc)
  const handleChange = (
    field: keyof TenantInfoUpdateRequest,
    value: string
  ) => {
    if (field === "phone") {
      value = formatPhoneNumber(value);
    }
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Update hours of operation (array)
  const updateHour = (
    index: number,
    field: keyof DayHours,
    value: string | boolean
  ) => {
    const updated = [...form.hours_of_operation];
    updated[index] = { ...updated[index], [field]: value };
    setForm((prev) => ({ ...prev, hours_of_operation: updated }));
  };

  // Validation using Yup schema, errors keyed by string (field name)
  const validate = async (): Promise<boolean> => {
    try {
      await tenantInfoSchema.validate(form, { abortEarly: false });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof Yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path) newErrors[error.path] = error.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Save handler calls onSave prop and disables UI while saving
  const handleSave = async () => {
    if (!(await validate())) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Disable save button if saving or required fields are empty
  const disabled = saving || !form.name || !form.email;

  return (
    <Dialog
      open={visible}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{ onExited }}
    >
      <DialogTitle>Edit Tenant Info</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {/* Text Fields */}
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            label="Phone"
            value={form.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone || "Format: (123) 456-7890"}
            fullWidth
          />
          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
            fullWidth
          />
          <TextField
            label="Address"
            value={form.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            error={!!errors.address}
            helperText={errors.address}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="City"
              value={form.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              error={!!errors.city}
              helperText={errors.city}
              fullWidth
            />
            <TextField
              label="State"
              value={form.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              error={!!errors.state}
              helperText={errors.state}
              sx={{ width: 120 }}
            />
            <TextField
              label="Zip Code"
              value={form.zip_code || ""}
              onChange={(e) => handleChange("zip_code", e.target.value)}
              error={!!errors.zip_code}
              helperText={errors.zip_code}
              sx={{ width: 150 }}
            />
          </Stack>

          {/* Hours of Operation */}
          <Typography variant="subtitle1" sx={{ mt: 2 }}>
            Hours of Operation
          </Typography>
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Day</TableCell>
                <TableCell>Closed</TableCell>
                <TableCell>Open Time</TableCell>
                <TableCell>Close Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {form.hours_of_operation.map((hour, i) => (
                <TableRow key={hour.day}>
                  <TableCell>{hour.day}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={hour.is_closed}
                      onChange={(e) =>
                        updateHour(i, "is_closed", e.target.checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="time"
                      value={hour.open_time || ""}
                      onChange={(e) =>
                        updateHour(i, "open_time", e.target.value)
                      }
                      disabled={hour.is_closed}
                      inputProps={{ step: 300 }} // 5 min increments
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="time"
                      value={hour.close_time || ""}
                      onChange={(e) =>
                        updateHour(i, "close_time", e.target.value)
                      }
                      disabled={hour.is_closed}
                      inputProps={{ step: 300 }}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      </DialogContent>

      <DialogActions>
        {confirmDelete && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={disabled}
          variant="contained"
          color="primary"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
