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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  PointOfSale as POSIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useIntegrationSettings } from './hooks/useIntegrationSettings';
import type { POSProvider } from '../../interfaces/pos';

export default function IntegrationSettings() {
  const {
    posSettings,
    posStatus,
    posImportHealth,
    isLoading,
    isStatusLoading,
    isImportHealthLoading,
    posError,
    isUpdatingMode,
    isDisconnecting,
    isSyncing,
    snackbar,
    closeSnackbar,
    handleModeChange,
    handleProviderChange,
    handleConnectPOS,
    handleSync,
    handleDisconnect,
  } = useIntegrationSettings();

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
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Integration Settings
      </Typography>

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

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" mb={2}>
                Import Health
              </Typography>

              {isImportHealthLoading ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
                    <Chip
                      label={`Recent Imports: ${posImportHealth?.summary.total_recent_imports ?? 0}`}
                      size="small"
                    />
                    <Chip
                      color={(posImportHealth?.summary.unmapped_items ?? 0) > 0 ? 'warning' : 'success'}
                      label={`Unmapped Items: ${posImportHealth?.summary.unmapped_items ?? 0}`}
                      size="small"
                    />
                    <Chip
                      color={(posImportHealth?.summary.failed_deductions ?? 0) > 0 ? 'error' : 'default'}
                      label={`Deduction Failures: ${posImportHealth?.summary.failed_deductions ?? 0}`}
                      size="small"
                    />
                    <Chip
                      label={`Pending Deductions: ${posImportHealth?.summary.pending_deductions ?? 0}`}
                      size="small"
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Last imported sale:{' '}
                    {posImportHealth?.summary.last_import_at
                      ? new Date(posImportHealth.summary.last_import_at).toLocaleString()
                      : 'No imports yet'}
                  </Typography>

                  <Box mb={2}>
                    <Typography variant="subtitle2" mb={1}>
                      Unmapped POS Items
                    </Typography>
                    {posImportHealth?.unmapped_items.length ? (
                      <Stack spacing={1}>
                        {posImportHealth.unmapped_items.map(item => (
                          <Alert key={item.mapping_id} severity="warning">
                            <strong>{item.external_item_name || item.external_item_id}</strong>
                            {` `}is not mapped to a PrepIQ menu item yet.
                          </Alert>
                        ))}
                      </Stack>
                    ) : (
                      <Alert severity="success">All imported POS items are currently mapped.</Alert>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" mb={1}>
                      Recent Import History
                    </Typography>
                    {posImportHealth?.recent_imports.length ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>External ID</TableCell>
                              <TableCell>Imported</TableCell>
                              <TableCell>Total</TableCell>
                              <TableCell>Inventory</TableCell>
                              <TableCell>Unmapped</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {posImportHealth.recent_imports.map(item => (
                              <TableRow key={item.order_id}>
                                <TableCell>{item.external_order_id || `Import #${item.order_id}`}</TableCell>
                                <TableCell>
                                  {item.imported_at
                                    ? new Date(item.imported_at).toLocaleString()
                                    : 'Unknown'}
                                </TableCell>
                                <TableCell>${item.total.toFixed(2)}</TableCell>
                                <TableCell>{item.inventory_deduction_state}</TableCell>
                                <TableCell>{item.unmapped_item_count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No POS imports recorded yet.</Alert>
                    )}
                  </Box>
                </>
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
