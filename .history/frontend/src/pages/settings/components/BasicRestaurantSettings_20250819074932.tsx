import React, { useEffect } from "react";
import { useRestaurantSettings } from "../hooks/useRestaurantSettings";
import { useUIStore } from "../../../stores/uiStore";
import BasicRestaurantSettingsModal from "./BasicRestaurantSettingsModal";

import { Paper, Stack, Typography, Divider } from "@mui/material";
import Button from "../../../components/Button";

export default function BasicRestaurantSettings(): JSX.Element {
  const { settings, loading, error, saveSettings, saving } = useRestaurantSettings();

  const { isEditing, formData, openEditModal, closeEditModal, updateFormField, showSnackbar, closeSnackbar } = useUIStore();

  useEffect(() => {
    if (settings && isEditing && !formData) {
      openEditModal(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, isEditing]);

  if (loading || !settings) {
    return (
      <Typography variant="body1" align="center" sx={{ mt: 4 }}>
        Loading...
      </Typography>
    );
  }

  if (error) {
    return (
      <Typography variant="body1" color="error" align="center" sx={{ mt: 4 }} role="alert">
        {(error as any).message}
      </Typography>
    );
  }

  const handleSave = async () => {
    try {
      await saveSettings(formData);
      showSnackbar("Settings saved successfully!", "success");
      closeEditModal();
    } catch (error: any) {
      showSnackbar(`Failed to save settings: ${error.message || error}`, "error");
      closeEditModal();
    }
  };

  return (
    <Paper sx={{ maxWidth: 1200, mt: 4, mx: "auto", px: { xs: 2, md: 4 }, py: { xs: 4, md: 8 } }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            Restaurant Settings
          </Typography>

          <Button variant="edit" onClick={() => openEditModal(settings)} requiredPermission="restaurant_settings" showIcon={false}>
            Edit
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1} color="text.primary">
          <Typography>
            <strong>Forecast Length:</strong> {settings.forecast_length} days
          </Typography>
          <Typography>
            <strong>Timezone:</strong> {settings.timezone ?? "N/A"}
          </Typography>
          <Typography>
            <strong>Run EOD When Closed:</strong> {settings.eod_run_when_closed ? "Yes" : "No"}
          </Typography>
          <Typography>
            <strong>EOD Buffer Time:</strong> {settings.eod_run_after_close_mins} minutes
          </Typography>
          <Typography>
            <strong>Sales Channels:</strong> {settings.sales_channels?.length ? settings.sales_channels.join(", ") : "None"}
          </Typography>
          <Typography>
            <strong>Restaurant location:</strong> {settings.latitude ? `${settings.latitude}, ${settings.longitude}` : "Not set"}
          </Typography>
        </Stack>
      </Paper>

      <BasicRestaurantSettingsModal visible={isEditing} formData={formData} onChange={updateFormField} onClose={closeEditModal} onExited={() => { closeEditModal(); }} onSave={handleSave} saving={saving} />
    </Paper>
  );
}
