import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormHelperText,
  Typography,
  Box,
} from "@mui/material";

interface Props {
  type: string | null;
  onClose: () => void;
  savePreferences: (p: any) => Promise<any>;
  updateUserEmail: (payload: any) => Promise<any>;
  updateUserPhone: (payload: any) => Promise<any>;
  changeUserPassword: (payload: any) => Promise<any>;
  loading: boolean;
  error: any;
  currentPreferences?: Record<string, any>;
  currentEmail?: string | null;
  currentPhone?: string | null;
  onShowSnackbar?: (message: string, severity?: "success" | "error") => void;
}

export default function BasicAccountSettingsModal({
  type,
  onClose,
  savePreferences,
  updateUserEmail,
  updateUserPhone,
  changeUserPassword,
  loading,
  error,
  currentPreferences,
  currentEmail,
  currentPhone,
  onShowSnackbar,
}: Props) {
  const [formData, setFormData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (type === "preferences") setFormData(currentPreferences || {});
    if (type === "email") setFormData({ currentPassword: "", newEmail: currentEmail || "" });
    if (type === "phone") setFormData({ currentPassword: "", newPhone: currentPhone || "" });
    if (type === "password") setFormData({ currentPassword: "", newPassword: "" });
  }, [type, currentPreferences, currentEmail, currentPhone]);

  const handleChange = (name: string, value: any) => setFormData((s: any) => ({ ...s, [name]: value }));

  const handleSave = async () => {
    try {
      if (type === "preferences") {
        await savePreferences(formData);
        onShowSnackbar?.("Preferences saved", "success");
      } else if (type === "email") {
        await updateUserEmail(formData);
        onShowSnackbar?.("Email updated", "success");
      } else if (type === "phone") {
        await updateUserPhone(formData);
        onShowSnackbar?.("Phone updated", "success");
      } else if (type === "password") {
        await changeUserPassword(formData);
        onShowSnackbar?.("Password changed", "success");
      }
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || String(err) });
      onShowSnackbar?.(err.message || String(err), "error");
    }
  };

  if (!type) return null;

  const title =
    type === "preferences"
      ? "Edit Preferences"
      : type === "email"
      ? "Change Email"
      : type === "phone"
      ? "Change Phone"
      : "Change Password";

  return (
    <Dialog open={!!type} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="account-settings-dialog-title">
      <DialogTitle id="account-settings-dialog-title">{title}</DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
          {type === "preferences" && (
            <TextField fullWidth label="Auto Logout Minutes" type="number" value={formData.auto_logout_minutes || 15} onChange={(e) => handleChange("auto_logout_minutes", parseInt(e.target.value, 10))} margin="normal" />
          )}

          {type === "email" && (
            <>
              <TextField fullWidth label="Current Password" type="password" value={formData.currentPassword || ""} onChange={(e) => handleChange("currentPassword", e.target.value)} margin="normal" />
              <TextField fullWidth label="New Email" type="email" value={formData.newEmail || ""} onChange={(e) => handleChange("newEmail", e.target.value)} margin="normal" />
            </>
          )}

          {type === "phone" && (
            <>
              <TextField fullWidth label="Current Password" type="password" value={formData.currentPassword || ""} onChange={(e) => handleChange("currentPassword", e.target.value)} margin="normal" />
              <TextField fullWidth label="New Phone" value={formData.newPhone || ""} onChange={(e) => handleChange("newPhone", e.target.value)} margin="normal" />
            </>
          )}

          {type === "password" && (
            <>
              <TextField fullWidth label="Current Password" type="password" value={formData.currentPassword || ""} onChange={(e) => handleChange("currentPassword", e.target.value)} margin="normal" />
              <TextField fullWidth label="New Password" type="password" value={formData.newPassword || ""} onChange={(e) => handleChange("newPassword", e.target.value)} margin="normal" />
            </>
          )}

          {errors.form && <FormHelperText error>{errors.form}</FormHelperText>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading} variant="contained" color="primary">
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
