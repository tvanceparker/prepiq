import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

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
  onShowSnackbar, // ✨ new prop for snackbar control
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setErrors({});

    switch (type) {
      case "preferences":
        setFormData({
          auto_logout_minutes:
            currentPreferences?.auto_logout_minutes === 0
              ? 0
              : currentPreferences?.auto_logout_minutes || 15,
          theme: currentPreferences?.theme || "light",
        });
        break;
      case "email":
        setFormData({ current_password: "", new_email: currentEmail });
        break;
      case "phone":
        setFormData({ current_password: "", new_phone: currentPhone || "" });
        break;
      case "password":
        setFormData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
        break;
      default:
        setFormData({});
        break;
    }
  }, [type, currentPreferences, currentEmail, currentPhone]);

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    const newValue = inputType === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSave = async () => {
    try {
      if (type === "preferences") {
        await savePreferences(formData);
        onShowSnackbar?.("Preferences saved.", "success");
      } else if (type === "email") {
        await updateUserEmail({
          currentPassword: formData.current_password,
          newEmail: formData.new_email,
        });
        onShowSnackbar?.("Email updated.", "success");
      } else if (type === "phone") {
        await updateUserPhone({
          currentPassword: formData.current_password,
          newPhone: formData.new_phone,
        });
        onShowSnackbar?.("Phone number updated.", "success");
      } else if (type === "password") {
        if (formData.new_password !== formData.confirm_password) {
          setErrors((prev) => ({
            ...prev,
            confirm_password: "Passwords do not match.",
          }));
          return;
        }
        await changeUserPassword({
          currentPassword: formData.current_password,
          newPassword: formData.new_password,
        });
        onShowSnackbar?.("Password changed.", "success");
      }

      onClose();
    } catch (err) {
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        console.error(err);
        onShowSnackbar?.("Something went wrong.", "error");
      }
    }
  };

  const getTitle = () => {
    switch (type) {
      case "preferences":
        return "Edit Preferences";
      case "email":
        return "Change Email";
      case "phone":
        return "Change Phone";
      case "password":
        return "Change Password";
      default:
        return "Edit";
    }
  };

  return (
    <Dialog open={!!type} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{getTitle()}</DialogTitle>
      <DialogContent>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
          {type === "preferences" && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.auto_logout_minutes === 0}
                    name="auto_logout_minutes_toggle"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        auto_logout_minutes: e.target.checked ? 0 : 15,
                      }))
                    }
                  />
                }
                label="Never auto logout"
              />
              <TextField
                label="Auto Logout (Minutes)"
                name="auto_logout_minutes"
                type="number"
                value={
                  formData.auto_logout_minutes === 0
                    ? ""
                    : formData.auto_logout_minutes
                }
                onChange={(e) => {
                  const val =
                    e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                  setFormData((prev) => ({
                    ...prev,
                    auto_logout_minutes: val,
                  }));
                }}
                disabled={formData.auto_logout_minutes === 0}
                error={Boolean(errors.auto_logout_minutes)}
                helperText={errors.auto_logout_minutes}
                fullWidth
                margin="normal"
              />
              <TextField
                select
                label="Theme"
                name="theme"
                value={formData.theme}
                onChange={handleChange}
                fullWidth
                margin="normal"
              >
                <MenuItem value="light">Light</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
                <MenuItem value="system">System Default</MenuItem>
              </TextField>
            </>
          )}

          {(type === "email" || type === "phone" || type === "password") && (
            <>
              <TextField
                label="Current Password"
                type="password"
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
                fullWidth
                margin="normal"
                error={Boolean(errors.current_password)}
                helperText={errors.current_password}
                required
              />
              {type === "email" && (
                <TextField
                  label="New Email"
                  type="email"
                  name="new_email"
                  value={formData.new_email}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  error={Boolean(errors.new_email)}
                  helperText={errors.new_email}
                  required
                />
              )}
              {type === "phone" && (
                <TextField
                  label="New Phone"
                  type="tel"
                  name="new_phone"
                  value={formData.new_phone}
                  onChange={handleChange}
                  fullWidth
                  margin="normal"
                  error={Boolean(errors.new_phone)}
                  helperText={errors.new_phone}
                  required
                />
              )}
              {type === "password" && (
                <>
                  <TextField
                    label="New Password"
                    type="password"
                    name="new_password"
                    value={formData.new_password}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    error={Boolean(errors.new_password)}
                    helperText={errors.new_password}
                    required
                  />
                  <TextField
                    label="Confirm Password"
                    type="password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    fullWidth
                    margin="normal"
                    error={Boolean(errors.confirm_password)}
                    helperText={errors.confirm_password}
                    required
                  />
                </>
              )}
            </>
          )}

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error.message || "An error occurred."}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
