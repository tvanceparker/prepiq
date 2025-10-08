import React, { useState } from 'react';
import useTenantInfo from '../hooks/useTenantInfo';
import TenantModal from './TenantModal';
import Button from '../../../components/Button';
import { PageHeader } from '../../../components/PageHeader';
import {
  Box,
  Typography,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Divider,
} from '@mui/material';
import { TenantInfoResponse, TenantInfoUpdateRequest } from '../../../interfaces/admin';

type Severity = 'error' | 'warning' | 'info' | 'success';

export default function TenantInfoBasic() {
  const { info, loading, error, saveTenantInfo } = useTenantInfo();

  const [showModal, setShowModal] = useState(false);
  const [initialFormData, setInitialFormData] = useState<TenantInfoResponse | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    severity: Severity;
    message: string;
  }>({
    open: false,
    severity: 'success',
    message: '',
  });

  const handleSave = async (data: TenantInfoUpdateRequest) => {
    if (!info) return;

    const fullData: TenantInfoResponse = {
      ...info,
      ...data,
    };

    try {
      await saveTenantInfo(fullData);
      setShowModal(false);
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Tenant Info updated successfully',
      });
    } catch {
      setSnackbar({
        open: true,
        severity: 'error',
        message: 'Failed to update Tenant Info',
      });
    }
  };

  const handleEditClick = () => {
    if (info) {
      setInitialFormData(info);
      setShowModal(true);
    }
  };

  // Helper to format address nicely
  const formatAddress = () => {
    if (!info) return '';
    const parts = [info.address, info.city, info.state, info.zip_code].filter(Boolean);
    return parts.join(', ');
  };

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
      <PageHeader title="Tenant Info" />

      {loading ? (
        <Box display="flex" justifyContent="center" my={6}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error" align="center" variant="h6" my={4}>
          Error loading data: {error.message}
        </Typography>
      ) : info ? (
        <Stack spacing={4}>
          <Typography variant="h5" fontWeight={700}>
            Basic Information
          </Typography>

          <Stack spacing={2}>
            {[
              { label: 'Name', value: info.name },
              { label: 'Phone', value: info.phone || '-' },
              { label: 'Email', value: info.email },
              { label: 'Address', value: formatAddress() || '-' },
            ].map(({ label, value }) => (
              <Stack
                key={label}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
              >
                <Typography variant="subtitle1" sx={{ width: 140, fontWeight: 600 }}>
                  {label}:
                </Typography>
                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                  {value}
                </Typography>
              </Stack>
            ))}

            <Divider sx={{ my: 2 }} />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
            >
              <Typography variant="subtitle1" sx={{ width: 140, fontWeight: 600 }}>
                Subscription:
              </Typography>
              <Typography variant="body1">
                {info.subscription_tier} - {info.subscription_status}
                {info.expiry_date
                  ? ` (Expires: ${new Date(info.expiry_date).toLocaleDateString()})`
                  : ''}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
              <Typography variant="subtitle1" sx={{ width: 140, fontWeight: 600, pt: 0.5 }}>
                Hours:
              </Typography>
              <Typography
                variant="body1"
                sx={{ whiteSpace: 'pre-line', fontFamily: 'Roboto Mono' }}
              >
                {info.hours_of_operation
                  .map(({ day, is_closed, open_time, close_time }) =>
                    is_closed ? `${day}: Closed` : `${day}: ${open_time} - ${close_time}`
                  )
                  .join('\n')}
              </Typography>
            </Stack>

            <Box pt={2}>
              <Button
                onClick={handleEditClick}
                variant="contained"
                size="large"
                requiredPermission="tenant_info"
              >
                Edit Info
              </Button>
            </Box>
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body1" align="center" my={4}>
          No tenant information available.
        </Typography>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {initialFormData && (
        <TenantModal
          visible={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          initialData={initialFormData}
          confirmDelete={false}
          setConfirmDelete={() => {}}
          onExited={() => {}}
        />
      )}
    </Paper>
  );
}
