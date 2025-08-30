import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useRegistrationModal } from '../contexts/RegistrationModalContext';
import { useDevice } from '../contexts/DeviceContext';
import { usePOS } from '../pages/pos/hooks/usePOS';

const RegistrationModalHost: React.FC = () => {
  const { open, closeModal, defaultName, deviceType } = useRegistrationModal();
  const { device } = useDevice();
  const { registerDevice, isLoading: posLoading } = usePOS();

  const [name, setName] = useState(defaultName || '');
  const [type, setType] = useState(deviceType || (device?.type ?? 'desktop'));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(defaultName || device?.userAgent || '');
      setType(deviceType || device?.type || 'desktop');
      setError(null);
    }
  }, [open, defaultName, deviceType, device]);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Device name is required');
      return;
    }

    if (!['mobile', 'pos_terminal', 'kitchen_display'].includes(type)) {
      setError('Only mobile, pos_terminal, or kitchen_display can be registered');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await registerDevice({
        device_type: type as any,
        device_name: name,
        fingerprint: {
          userAgent: navigator.userAgent,
          screenResolution: `${(window as any).screen?.width || 0}x${(window as any).screen?.height || 0}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          plugins: Array.from(navigator.plugins).map((p: any) => p.name),
          canvasFingerprint: '',
          webglFingerprint: '',
        },
      });
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={closeModal} maxWidth="sm" fullWidth>
      <DialogTitle>Register Device</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Register this device for dedicated terminal features.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="Device Name"
          value={name}
          onChange={e => setName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth>
          <InputLabel>Device Type</InputLabel>
          <Select value={type} label="Device Type" onChange={e => setType(e.target.value)}>
            <MenuItem value="mobile">Mobile</MenuItem>
            <MenuItem value="pos_terminal">POS Terminal</MenuItem>
            <MenuItem value="kitchen_display">Kitchen Display</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeModal} variant="outlined" disabled={loading || posLoading}>
          Cancel
        </Button>
        <Button onClick={handleRegister} variant="contained" disabled={loading || posLoading}>
          {loading || posLoading ? <CircularProgress size={18} /> : 'Register Device'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RegistrationModalHost;
