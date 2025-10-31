import React, { useState } from 'react';
import type { AlertColor } from '@mui/material';
import { useAccountSettings } from '../hooks/useAccountSettings';
import BasicAccountSettingsModal from './BasicAccountSettingsModal';
import type { LabeledValueProps } from '../../../interfaces/settings';
import {
  Box,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Snackbar,
  Alert as MuiAlert,
  useTheme,
} from '@mui/material';

import Button from '../../../components/Button'; // ✅ Custom Button

export default function BasicAccountSettings() {
  const theme = useTheme();
  const {
    accountInfo,
    loadingAccountInfo,
    errorAccountInfo,
    updateLoading,
    updateError,
    savePreferences,
    updateUserEmail,
    updateUserPhone,
    changeUserPassword,
  } = useAccountSettings();

  const [modalType, setModalType] = useState(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = (message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const openModal = type => setModalType(type);
  const closeModal = () => setModalType(null);

  if (loadingAccountInfo) {
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
        <CircularProgress />
        <Typography variant="body1">Loading account info...</Typography>
      </Box>
    );
  }

  if (errorAccountInfo) {
    return (
      <Alert severity="error" sx={{ mt: 8, maxWidth: 600, mx: 'auto' }}>
        Error: {errorAccountInfo.message}
      </Alert>
    );
  }

  if (!accountInfo) return null;

  const LabeledValue = ({ label, value, buttonLabel, onButtonClick }: LabeledValueProps) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mb: onButtonClick ? 1 : 0 }}>
        {value}
      </Typography>
      {onButtonClick && (
        <Button size="small" muiVariant="contained" variant="edit" iconOnly onClick={onButtonClick}>
          {buttonLabel}
        </Button>
      )}
    </Box>
  );

  return (
    <Paper
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary" gutterBottom>
        Account Settings
      </Typography>

      <Grid container spacing={4}>
        {/* User Info */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              User Info
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <LabeledValue label="Name" value={accountInfo.name} />
            <LabeledValue label="Role" value={accountInfo.role} />
            <LabeledValue label="Restaurant" value={accountInfo.restaurant_name || 'N/A'} />
          </Paper>
        </Grid>

        {/* Contact Info */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Contact Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <LabeledValue
              label="Email"
              value={accountInfo.email}
              buttonLabel="Change Email"
              onButtonClick={() => openModal('email')}
            />
            <LabeledValue
              label="Phone"
              value={accountInfo.phone || 'Not set'}
              buttonLabel="Change Phone"
              onButtonClick={() => openModal('phone')}
            />
          </Paper>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Security
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Button
              muiVariant="contained"
              size="small"
              variant="edit"
              onClick={() => openModal('password')}
            >
              Change Password
            </Button>
          </Paper>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              User Preferences
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <LabeledValue
              label="Auto Logout Minutes"
              value={
                accountInfo.preferences?.auto_logout_minutes === 0
                  ? 'Never'
                  : (accountInfo.preferences?.auto_logout_minutes ?? 'Not set')
              }
            />
            <LabeledValue
              label="Theme"
              value={accountInfo.preferences?.theme || 'Not set'}
              buttonLabel="Edit Preferences"
              onButtonClick={() => openModal('preferences')}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Modal */}
      {modalType && (
        <BasicAccountSettingsModal
          type={modalType}
          onClose={closeModal}
          savePreferences={savePreferences}
          updateUserEmail={updateUserEmail}
          updateUserPhone={updateUserPhone}
          changeUserPassword={changeUserPassword}
          loading={updateLoading}
          error={updateError}
          currentPreferences={accountInfo.preferences}
          currentEmail={accountInfo.email}
          currentPhone={accountInfo.phone}
          onShowSnackbar={showSnackbar}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Paper>
  );
}
