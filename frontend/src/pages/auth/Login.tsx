import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoginForm } from './hooks/useLoginForm';
import { AuthContext } from '../../contexts/AuthContext';
import {
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';

interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  plugins: string[];
  canvasFingerprint: string;
  webglFingerprint: string;
}

export default function Login(): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDeviceRegistration, setShowDeviceRegistration] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('pos_terminal');
  const [deviceRegistrationLoading, setDeviceRegistrationLoading] = useState(false);
  const { handleLogin, loading, errorMsg } = useLoginForm();
  const { token } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate('/dashboard/daily-overview');
    }
  }, [token, navigate]);

  const generateDeviceFingerprint = (): DeviceFingerprint => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('fingerprint', 10, 10);
    const canvasFingerprint = canvas.toDataURL();

    const gl = document.createElement('canvas').getContext('webgl');
    const webglFingerprint = gl
      ? (gl.getParameter(gl.RENDERER) || '') + (gl.getParameter(gl.VENDOR) || '')
      : '';

    return {
      userAgent: navigator.userAgent,
      screenResolution: window.screen ? `${window.screen.width}x${window.screen.height}` : '0x0',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      plugins: Array.from(navigator.plugins).map(p => p.name),
      canvasFingerprint,
      webglFingerprint,
    };
  };

  const handleDeviceRegistration = async () => {
    if (!deviceName.trim()) return;

    setDeviceRegistrationLoading(true);
    try {
      const fingerprint = generateDeviceFingerprint();
      const response = await fetch('/pos/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device_type: deviceType,
          device_name: deviceName,
          fingerprint,
        }),
      });

      if (!response.ok) throw new Error('Device registration failed');

      const data = await response.json();
      localStorage.setItem('pos_device_id', data.device_id);
      localStorage.setItem('pos_device_token', data.device_token);

      setShowDeviceRegistration(false);
      navigate('/dashboard/daily-overview');
    } catch (error) {
      console.error('Device registration error:', error);
    } finally {
      setDeviceRegistrationLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await handleLogin(username, password);

    if (result?.success) {
      const deviceId = localStorage.getItem('pos_device_id');
      const deviceToken = localStorage.getItem('pos_device_token');

      if (!deviceId || !deviceToken) {
        setShowDeviceRegistration(true);
      } else {
        try {
          const fingerprint = generateDeviceFingerprint();
          const response = await fetch('/pos/refresh-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ device_id: deviceId, fingerprint }),
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('pos_device_token', data.device_token);
            navigate('/dashboard/daily-overview');
          } else {
            setShowDeviceRegistration(true);
          }
        } catch {
          setShowDeviceRegistration(true);
        }
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        px: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%',
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: theme => theme.shadows[6],
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{ mb: 3, fontWeight: 'bold', color: 'text.primary' }}
        >
          Login to PrepIQ
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            required
            margin="normal"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />

          <TextField
            label="Password"
            variant="outlined"
            fullWidth
            required
            margin="normal"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {errorMsg && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errorMsg}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 3, py: 1.5, fontWeight: '600' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </Box>
      </Paper>

      <Dialog open={showDeviceRegistration} maxWidth="sm" fullWidth>
        <DialogTitle>Register Device</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This device needs to be registered to access POS features. Please provide a name for
            this device.
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
              onChange={e => setDeviceType(e.target.value)}
              label="Device Type"
            >
              <MenuItem value="pos_terminal">POS Terminal</MenuItem>
              <MenuItem value="kitchen_display">Kitchen Display</MenuItem>
              <MenuItem value="mobile">Mobile Device</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeviceRegistration}
            variant="contained"
            disabled={!deviceName.trim() || deviceRegistrationLoading}
            startIcon={deviceRegistrationLoading ? <CircularProgress size={20} /> : null}
          >
            {deviceRegistrationLoading ? 'Registering...' : 'Register Device'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
