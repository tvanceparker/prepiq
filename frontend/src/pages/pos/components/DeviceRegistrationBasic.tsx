// frontend/src/pages/pos/components/DeviceRegistrationBasic.tsx
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  PointOfSale as PosIcon,
  Kitchen as KitchenIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useDeviceDetection } from '../../../hooks/useDeviceDetection';
import { usePOS } from '../hooks/usePOS';

import { DeviceType } from '../../../interfaces/pos';

const DeviceRegistrationBasic: React.FC = () => {
  const { device, isLoading, updateDeviceType, refresh } = useDeviceDetection();
  const {
    device: registeredDevice,
    isRegistered,
    isLoading: posLoading,
    registerDevice,
  } = usePOS();

  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  const deviceTypeOptions: {
    value: DeviceType;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      value: 'desktop',
      label: 'Desktop/Web Browser',
      icon: <DesktopIcon />,
      description: 'Full web interface for order management and analytics',
    },
    {
      value: 'mobile',
      label: 'Mobile Device',
      icon: <MobileIcon />,
      description: 'Touch-optimized interface for on-the-go order entry',
    },
    {
      value: 'pos_terminal',
      label: 'POS Terminal',
      icon: <PosIcon />,
      description: 'Dedicated checkout station with payment processing',
    },
    {
      value: 'kitchen_display',
      label: 'Kitchen Display',
      icon: <KitchenIcon />,
      description: 'Order preparation screen for kitchen staff',
    },
  ];

  const handleDeviceTypeChange = (type: DeviceType) => {
    updateDeviceType(type);
    setDeviceType(type);
  };

  const handleRegisterDevice = async () => {
    if (!deviceName.trim()) {
      setRegistrationError('Device name is required');
      return;
    }

    if (!['mobile', 'pos_terminal', 'kitchen_display'].includes(deviceType)) {
      setRegistrationError('Desktop devices cannot be registered as dedicated terminals');
      return;
    }

    setRegistrationLoading(true);
    setRegistrationError(null);

    try {
      await registerDevice({
        device_type: deviceType as 'mobile' | 'pos_terminal' | 'kitchen_display',
        device_name: deviceName,
        fingerprint: {
          userAgent: navigator.userAgent,
          screenResolution: `${device.screenWidth}x${device.screenHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          plugins: Array.from(navigator.plugins).map(p => p.name),
          canvasFingerprint: '',
          webglFingerprint: '',
        },
      });

      setShowRegistrationDialog(false);
      setDeviceName('');
    } catch (err: any) {
      setRegistrationError(err.message || 'Failed to register device');
    } finally {
      setRegistrationLoading(false);
    }
  };

  const getDeviceTypeIcon = (type: DeviceType) => {
    const option = deviceTypeOptions.find(opt => opt.value === type);
    return option?.icon || <DevicesIcon />;
  };

  const getDeviceTypeLabel = (type: DeviceType) => {
    const option = deviceTypeOptions.find(opt => opt.value === type);
    return option?.label || type;
  };

  if (isLoading || posLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Device Registration & Configuration
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Configure your device for optimal POS experience. Register dedicated terminals or customize
        your interface.
      </Typography>

      {registrationError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRegistrationError(null)}>
          {registrationError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Current Device Configuration
            </Typography>

            <Box display="flex" alignItems="center" mb={2}>
              {getDeviceTypeIcon(device.type)}
              <Box ml={2}>
                <Typography variant="h6">{getDeviceTypeLabel(device.type)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {device.screenWidth} × {device.screenHeight} •{' '}
                  {device.isTouch ? 'Touch' : 'Mouse'}
                </Typography>
              </Box>
            </Box>

            <Box mb={2}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Device Capabilities:
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {device.capabilities.touch && <Chip label="Touch" size="small" color="primary" />}
                {device.capabilities.orientation && (
                  <Chip label="Orientation" size="small" color="secondary" />
                )}
                {device.capabilities.highResolution && (
                  <Chip label="High DPI" size="small" color="info" />
                )}
              </Box>
            </Box>

            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refresh} fullWidth>
              Refresh Detection
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Device Type
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Choose the interface that best fits your workflow:
            </Typography>

            <Grid container spacing={2}>
              {deviceTypeOptions.map(option => (
                <Grid item xs={12} key={option.value}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border:
                        device.type === option.value ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      backgroundColor: device.type === option.value ? '#f3f9ff' : 'white',
                    }}
                    onClick={() => handleDeviceTypeChange(option.value)}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      <Box display="flex" alignItems="center">
                        {option.icon}
                        <Box ml={2}>
                          <Typography variant="h6">{option.label}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Device Registration Status
            </Typography>

            {isRegistered ? (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Registered:</strong> {registeredDevice?.device_name} (
                  {registeredDevice?.device_type})
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  This device is not registered. Register it for dedicated terminal features and
                  synchronization.
                </Typography>
              </Alert>
            )}

            <Box display="flex" gap={2}>
              {!isRegistered && (
                <Button variant="contained" onClick={() => setShowRegistrationDialog(true)}>
                  Register Device
                </Button>
              )}
              <Button variant="outlined" onClick={() => window.location.reload()}>
                Reload Interface
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={showRegistrationDialog}
        onClose={() => setShowRegistrationDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Register Device</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Register this device for dedicated terminal features and real-time synchronization.
          </Typography>

          <TextField
            fullWidth
            label="Device Name"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            placeholder="e.g., Front Counter POS"
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Device Type</InputLabel>
            <Select
              value={deviceType}
              onChange={e => setDeviceType(e.target.value as DeviceType)}
              label="Device Type"
            >
              {deviceTypeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  <Box display="flex" alignItems="center">
                    {option.icon}
                    <Typography sx={{ ml: 1 }}>{option.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {registrationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {registrationError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowRegistrationDialog(false)}
            variant="outlined"
            disabled={registrationLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegisterDevice}
            variant="contained"
            disabled={!deviceName.trim() || registrationLoading}
            startIcon={registrationLoading ? <CircularProgress size={20} /> : null}
          >
            {registrationLoading ? 'Registering...' : 'Register Device'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceRegistrationBasic;
