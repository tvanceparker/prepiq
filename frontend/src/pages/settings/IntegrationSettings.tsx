import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Alert,
  Snackbar,
  Divider,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  PointOfSale as POSIcon,
  CreditCard as CardIcon,
  MonetizationOn as CashIcon,
  Sync as SyncIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useIntegrationSettings } from './hooks/useIntegrationSettings';
import type { POSMode, POSProvider, TerminalReader } from '../../interfaces/pos';

export default function IntegrationSettings() {
  // Dialog states
  const [readerDialogOpen, setReaderDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [newReaderCode, setNewReaderCode] = useState('');
  const [newReaderLabel, setNewReaderLabel] = useState('');

  // Use the custom hook
  const {
    posSettings,
    posStatus,
    terminalReaders,
    terminalLocation,
    isLoading,
    isStatusLoading,
    isReadersLoading,
    posError,
    isUpdatingMode,
    isDisconnecting,
    isSyncing,
    isRegisteringReader,
    snackbar,
    closeSnackbar,
    handleModeChange,
    handleProviderChange,
    handleCashDrawerToggle,
    handleConnectPOS,
    handleRegisterReader,
    handleDeleteReader,
    handleSyncReaderStatus,
    handleSync,
    handleDisconnect,
  } = useIntegrationSettings();

  // Local handler for register reader dialog
  const onRegisterReader = () => {
    const success = handleRegisterReader(newReaderCode, newReaderLabel);
    if (success) {
      setReaderDialogOpen(false);
      setNewReaderCode('');
      setNewReaderLabel('');
    }
  };

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

      {/* POS Mode Selection */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <POSIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">Point of Sale Mode</Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" mb={2}>
            Choose how you want to manage orders and payments. You can use PrepIQ's built-in POS or
            connect an external system like Square.
          </Typography>

          <FormControl component="fieldset">
            <RadioGroup
              value={posSettings?.pos_mode || 'none'}
              onChange={e => handleModeChange(e.target.value as POSMode)}
            >
              <FormControlLabel
                value="internal"
                control={<Radio />}
                label={
                  <Box>
                    <Typography fontWeight="medium">PrepIQ Internal POS</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use PrepIQ for orders, payments (Stripe), and kitchen display
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="external"
                control={<Radio />}
                label={
                  <Box>
                    <Typography fontWeight="medium">External POS Integration</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connect Square, Toast, or Clover to sync orders and sales
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>

      {/* Internal POS Settings */}
      {posSettings?.pos_mode === 'internal' && (
        <>
          {/* Cash Drawer */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CashIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">Cash Drawer Tracking</Typography>
                <Box flexGrow={1} />
                <Switch
                  checked={posSettings?.cash_drawer_enabled || false}
                  onChange={handleCashDrawerToggle}
                  disabled={isUpdatingMode}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Track cash drawer sessions, opening/closing floats, and reconcile cash at end of
                shift. Enable for cash handling accountability.
              </Typography>
            </CardContent>
          </Card>

          {/* Terminal Readers */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CardIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">Card Readers (Stripe Terminal)</Typography>
                <Box flexGrow={1} />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setReaderDialogOpen(true)}
                >
                  Add Reader
                </Button>
              </Box>

              {!terminalLocation && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  You need to create a Terminal location before registering readers.
                  <Button size="small" sx={{ ml: 2 }} onClick={() => setLocationDialogOpen(true)}>
                    Create Location
                  </Button>
                </Alert>
              )}

              {isReadersLoading ? (
                <CircularProgress size={24} />
              ) : terminalReaders.length > 0 ? (
                <List>
                  {terminalReaders.map((reader: TerminalReader) => (
                    <ListItem key={reader.reader_id} divider>
                      <ListItemIcon>
                        {reader.status === 'online' ? (
                          <CheckCircleIcon color="success" />
                        ) : (
                          <ErrorIcon color="disabled" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={reader.label}
                        secondary={`${reader.device_type} • ${reader.status}`}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Sync Status">
                          <IconButton
                            size="small"
                            onClick={() => handleSyncReaderStatus(reader.reader_id)}
                          >
                            <RefreshIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteReader(reader.reader_id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No card readers registered. Add a Stripe Terminal reader to accept in-person card
                  payments.
                </Typography>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* External POS Settings */}
      {posSettings?.pos_mode === 'external' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">External POS Provider</Typography>
            </Box>

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

            {/* Connection Status */}
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

            {/* Sync Controls */}
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
              </>
            )}

            {/* Cash Drawer for External */}
            <Divider sx={{ my: 2 }} />
            <Box display="flex" alignItems="center">
              <CashIcon sx={{ mr: 1, color: 'success.main' }} />
              <Typography variant="subtitle2">Cash Drawer Tracking</Typography>
              <Box flexGrow={1} />
              <Switch
                checked={posSettings?.cash_drawer_enabled || false}
                onChange={handleCashDrawerToggle}
                disabled={isUpdatingMode}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Track cash separately from your external POS
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Register Reader Dialog */}
      <Dialog open={readerDialogOpen} onClose={() => setReaderDialogOpen(false)}>
        <DialogTitle>Register Card Reader</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Enter the pairing code displayed on your Stripe Terminal reader.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Registration Code"
            value={newReaderCode}
            onChange={e => setNewReaderCode(e.target.value)}
            placeholder="sepia-cerulean-magic"
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Reader Label"
            value={newReaderLabel}
            onChange={e => setNewReaderLabel(e.target.value)}
            placeholder="Counter 1"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReaderDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={onRegisterReader}
            disabled={!newReaderCode || !newReaderLabel || isRegisteringReader}
          >
            {isRegisteringReader ? 'Registering...' : 'Register'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Location Dialog */}
      <Dialog
        open={locationDialogOpen}
        onClose={() => setLocationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Terminal Location</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            A location is required to register card readers. This is typically your restaurant
            address.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Location creation will be implemented in restaurant settings. Please ensure your
            restaurant address is complete.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLocationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar}>
        <Alert severity={snackbar.severity} onClose={closeSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
