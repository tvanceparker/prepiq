import React, { useEffect } from 'react';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';
import { useUIStore } from '../../../stores/uiStore';
import BasicRestaurantSettingsModal from './BasicRestaurantSettingsModal';
import type { RestaurantSettings } from '../../../interfaces/settings';

import {
  Paper,
  Stack,
  Typography,
  Divider,
  Grid,
  Box,
  CircularProgress,
  Alert,
  Chip,
  Avatar,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Public as TimezoneIcon,
  EventRepeat as EODIcon,
  Timer as TimerIcon,
  Storefront as ChannelIcon,
  Inventory2 as InventoryIcon,
  NotificationsActive as AlertIcon,
} from '@mui/icons-material';
import Button from '../../../components/Button';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, label, value, color }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
      }}
    >
      <Avatar
        sx={{
          bgcolor: alpha(color, 0.1),
          color: color,
          width: 44,
          height: 44,
        }}
      >
        {icon}
      </Avatar>
      <Box flex={1}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
        <Typography variant="body1" fontWeight={600} color="text.primary">
          {value}
        </Typography>
      </Box>
    </Box>
  );
};

export default function BasicRestaurantSettings() {
  const theme = useTheme();
  const { settings, loading, error, saveSettings, saving } = useRestaurantSettings();

  const { isEditing, formData, openEditModal, closeEditModal, updateFormField, showSnackbar } =
    useUIStore();

  const applyDefaults = (data: RestaurantSettings): RestaurantSettings => ({
    ...data,
    inventory_deduction_mode: data.inventory_deduction_mode ?? 'eod',
  });

  useEffect(() => {
    if (settings && isEditing && !formData) {
      openEditModal(applyDefaults(settings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, isEditing]);

  if (loading || !settings) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          mt: 8,
        }}
      >
        <CircularProgress size={24} />
        <Typography variant="body1" color="text.secondary">
          Loading restaurant settings...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
        {error.message}
      </Alert>
    );
  }

  const handleSave = async () => {
    try {
      await saveSettings(formData);
      showSnackbar('Settings saved successfully!', 'success');
      closeEditModal();
    } catch (err: any) {
      showSnackbar(`Failed to save settings: ${err?.message || err}`, 'error');
      closeEditModal();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 3, md: 5 },
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              width: 48,
              height: 48,
            }}
          >
            <SettingsIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Restaurant Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure forecasting and operational settings
            </Typography>
          </Box>
        </Box>
        <Button
          variant="edit"
          onClick={() => settings && openEditModal(applyDefaults(settings))}
          requiredPermission="restaurant_settings"
          showIcon={false}
        >
          Edit Settings
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Settings Grid */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4}>
          <SettingItem
            icon={<ScheduleIcon />}
            label="Forecast Length"
            value={`${settings.forecast_length} days`}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SettingItem
            icon={<TimezoneIcon />}
            label="Timezone"
            value={settings.timezone ?? 'Not configured'}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SettingItem
            icon={<EODIcon />}
            label="Run EOD When Closed"
            value={settings.eod_run_when_closed ? 'Enabled' : 'Disabled'}
            color={
              settings.eod_run_when_closed ? theme.palette.success.main : theme.palette.grey[500]
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SettingItem
            icon={<TimerIcon />}
            label="EOD Buffer Time"
            value={`${settings.eod_run_after_close_mins} minutes`}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <SettingItem
            icon={<InventoryIcon />}
            label="Inventory Deduction"
            value={
              settings.inventory_deduction_mode === 'real_time'
                ? 'Real-time (Pro/Master)'
                : 'End of Day'
            }
            color={
              settings.inventory_deduction_mode === 'real_time'
                ? theme.palette.success.main
                : theme.palette.info.main
            }
          />
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.paper,
              height: '100%',
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={1.5}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                  width: 44,
                  height: 44,
                }}
              >
                <ChannelIcon />
              </Avatar>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                Sales Channels
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {settings.sales_channels?.length ? (
                settings.sales_channels.map(channel => (
                  <Chip
                    key={channel}
                    label={channel}
                    size="small"
                    variant="outlined"
                    color="secondary"
                    sx={{ fontWeight: 500 }}
                  />
                ))
              ) : (
                <Typography variant="body2" color="text.disabled">
                  No sales channels configured
                </Typography>
              )}
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Alert
            icon={<AlertIcon fontSize="inherit" />}
            severity={settings.inventory_deduction_mode === 'real_time' ? 'success' : 'info'}
            sx={{ mt: 1 }}
          >
            {settings.inventory_deduction_mode === 'real_time'
              ? 'Real-time deductions automatically adjust ingredient and batch inventory as soon as orders complete. Any failures trigger alerts instantly.'
              : 'End-of-day deductions run during the nightly EOD pipeline. Switch to real-time to catch shortages sooner and receive immediate alerts.'}
          </Alert>
        </Grid>
      </Grid>

      <BasicRestaurantSettingsModal
        visible={isEditing}
        formData={formData}
        onChange={updateFormField}
        onClose={closeEditModal}
        onExited={() => {
          closeEditModal();
        }}
        onSave={handleSave}
        saving={saving}
      />
    </Paper>
  );
}
