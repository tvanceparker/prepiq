import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Snackbar,
  Divider,
  Chip,
  CircularProgress,
  Switch,
  TextField,
  FormControlLabel,
} from '@mui/material';
import {
  PointOfSale as POSIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  SmartToy as AssistantIcon,
} from '@mui/icons-material';
import { useIntegrationSettings } from './hooks/useIntegrationSettings';
import type { POSProvider } from '../../interfaces/pos';
import { PageHeader } from '../../components/PageHeader';

export default function IntegrationSettings() {
  const {
    posSettings,
    posStatus,
    lastSyncResult,
    isLoading,
    isStatusLoading,
    posError,
    isUpdatingMode,
    isDisconnecting,
    isSyncing,
    snackbar,
    closeSnackbar,
    assistantSettings,
    assistantApiKeyInput,
    isAssistantLoading,
    assistantError,
    isUpdatingAssistant,
    isDeletingAssistantApiKey,
    handleModeChange,
    handleProviderChange,
    handleConnectPOS,
    handleSync,
    handleDisconnect,
    handleAssistantToggle,
    handleAssistantApiKeyInputChange,
    handleSaveAssistantApiKey,
    handleDeleteAssistantApiKey,
  } = useIntegrationSettings();

  const syncSummarySeverity =
    lastSyncResult?.status === 'failed'
      ? 'error'
      : lastSyncResult?.status === 'partial'
        ? 'warning'
        : 'success';

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (posError) {
    return <Alert severity="error">Failed to load POS settings. Please try again.</Alert>;
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <PageHeader
        eyebrow="Settings"
        title="Integration Settings"
        description="Manage the active external POS connection, review sync status, and keep the v1 integration surface focused on the supported provider workflow."
        icon={<POSIcon />}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center">
              <AssistantIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Assistant</Typography>
            </Box>
            {isAssistantLoading ? (
              <CircularProgress size={20} />
            ) : (
              <Chip
                icon={assistantSettings?.api_key_configured ? <CheckCircleIcon /> : <WarningIcon />}
                label={assistantSettings?.api_key_configured ? 'Key configured' : 'Key missing'}
                color={assistantSettings?.api_key_configured ? 'success' : 'warning'}
                size="small"
              />
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            Configure the restaurant assistant and optionally save a restaurant-specific OpenAI API
            key. The key is stored encrypted and is never returned to the client after save.
          </Typography>

          {assistantError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load assistant settings. Please try again.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={assistantSettings?.enabled ?? false}
                onChange={event => handleAssistantToggle(event.target.checked)}
                disabled={isAssistantLoading || isUpdatingAssistant}
              />
            }
            label="Enable assistant"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="OpenAI API Key"
            type="password"
            value={assistantApiKeyInput}
            onChange={event => handleAssistantApiKeyInputChange(event.target.value)}
            placeholder={
              assistantSettings?.api_key_configured
                ? 'Enter a new key to replace the current one'
                : 'sk-...'
            }
            helperText={
              assistantSettings?.api_key_configured
                ? `Current key ends in ${assistantSettings.api_key_last4 ?? 'unknown'}${assistantSettings.api_key_updated_at ? ` • Updated ${new Date(assistantSettings.api_key_updated_at).toLocaleString()}` : ''}`
                : 'No restaurant-specific key saved yet. The backend can later fall back to an env key if configured.'
            }
            sx={{ mb: 2 }}
          />

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              onClick={handleSaveAssistantApiKey}
              disabled={isUpdatingAssistant}
            >
              {assistantSettings?.api_key_configured ? 'Replace Key' : 'Save Key'}
            </Button>

            <Button
              variant="outlined"
              color="error"
              onClick={handleDeleteAssistantApiKey}
              disabled={!assistantSettings?.api_key_configured || isDeletingAssistantApiKey}
            >
              Remove Key
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <POSIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">External POS Integration</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            PrepIQ v1 connects to your existing POS. Choose a provider, connect it, and manage sync
            status from here.
          </Typography>

          {posSettings?.pos_mode !== 'external' && (
            <Alert severity="info" sx={{ mb: 3 }}>
              PrepIQ v1 uses external POS ingestion. Switching this restaurant to external mode will
              hide internal terminal-era workflows from the active experience.
              <Button
                size="small"
                sx={{ ml: 2 }}
                onClick={() => handleModeChange('external')}
                disabled={isUpdatingMode}
              >
                Switch to External
              </Button>
            </Alert>
          )}

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>POS Provider</InputLabel>
            <Select
              value={posSettings?.pos_provider || 'square'}
              label="POS Provider"
              onChange={e => handleProviderChange(e.target.value as POSProvider)}
            >
              <MenuItem value="square">Square</MenuItem>
              <MenuItem value="toast" disabled>
                Toast (Coming Soon)
              </MenuItem>
              <MenuItem value="clover" disabled>
                Clover (Coming Soon)
              </MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          <Box mb={2}>
            <Typography variant="subtitle2" color="text.secondary" mb={1}>
              Connection Status
            </Typography>
            {isStatusLoading ? (
              <CircularProgress size={20} />
            ) : posStatus?.connected ? (
              <Box display="flex" alignItems="center" gap={2}>
                <Chip icon={<CheckCircleIcon />} label="Connected" color="success" size="small" />
                <Typography variant="body2">Merchant: {posStatus.merchant_id}</Typography>
                <Box flexGrow={1} />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<LinkOffIcon />}
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  Disconnect
                </Button>
              </Box>
            ) : (
              <Box display="flex" alignItems="center" gap={2}>
                <Chip icon={<WarningIcon />} label="Not Connected" color="warning" size="small" />
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => handleConnectPOS(posSettings?.pos_provider || 'square')}
                >
                  Connect {posSettings?.pos_provider || 'Square'}
                </Button>
              </Box>
            )}
          </Box>

          {posStatus?.connected && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Sync:{' '}
                  {posStatus.last_sync ? new Date(posStatus.last_sync).toLocaleString() : 'Never'}
                </Typography>
                <Box flexGrow={1} />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SyncIcon />}
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </Box>

              {lastSyncResult && (
                <Alert severity={syncSummarySeverity} sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Latest Sync Result
                  </Typography>
                  <Typography variant="body2">{lastSyncResult.message}</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Orders fetched: {lastSyncResult.total_orders_fetched} • Ingested:{' '}
                    {lastSyncResult.total_orders_ingested} • Failed:{' '}
                    {lastSyncResult.total_orders_failed} • Duplicates:{' '}
                    {lastSyncResult.duplicate_orders}
                  </Typography>

                  {lastSyncResult.failed_orders.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" fontWeight={700} display="block">
                        Failed Orders
                      </Typography>
                      {lastSyncResult.failed_orders.map((failure, index) => (
                        <Typography
                          key={`${failure.external_id || 'unknown'}-${index}`}
                          variant="body2"
                        >
                          {failure.external_id || 'Unknown order'}: {failure.reason}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  {lastSyncResult.unmapped_items.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" fontWeight={700} display="block">
                        Unmapped Items
                      </Typography>
                      <Typography variant="body2">
                        {lastSyncResult.unmapped_items.join(', ')}
                      </Typography>
                    </Box>
                  )}

                  {lastSyncResult.deduction_failures.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" fontWeight={700} display="block">
                        Deduction Failures
                      </Typography>
                      <Typography variant="body2">
                        {lastSyncResult.deduction_failures.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Alert>
              )}
            </>
          )}

          <Divider sx={{ my: 2 }} />
          <Alert severity="info">
            Internal POS terminals, cash drawers, device registration, and Stripe reader workflows
            are intentionally out of the active v1 product surface.
          </Alert>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar}>
        <Alert severity={snackbar.severity} onClose={closeSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
