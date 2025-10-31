import React from 'react';
import type { RestaurantSettingsFormErrors } from '../../../interfaces/settings';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  FormHelperText,
  Typography,
  Box,
} from '@mui/material';
import TagInput from '../../../components/TagInput';

export default function BasicRestaurantSettingsModal({
  visible,
  formData,
  onChange,
  onClose,
  onSave,
  saving,
  onExited,
  errors = {} as RestaurantSettingsFormErrors,
}) {
  if (!formData) return null;

  return (
    <Dialog
      open={visible}
      onClose={onClose}
      TransitionProps={{ onExited }}
      fullWidth
      maxWidth="sm"
      aria-labelledby="restaurant-settings-dialog-title"
    >
      <DialogTitle id="restaurant-settings-dialog-title">Edit Restaurant Settings</DialogTitle>
      <DialogContent dividers>
        <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
          <TextField
            select
            fullWidth
            label="Forecast Length"
            name="forecast_length"
            value={formData.forecast_length}
            onChange={e => onChange('forecast_length', parseInt(e.target.value, 10))}
            error={!!errors.forecast_length}
            helperText={errors.forecast_length}
            margin="normal"
          >
            {[3, 7, 14, 30].map(val => (
              <MenuItem key={val} value={val}>
                {val} Days
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Timezone"
            name="timezone"
            value={formData.timezone ?? ''}
            onChange={e => onChange('timezone', e.target.value)}
            error={!!errors.timezone}
            helperText={errors.timezone}
            margin="normal"
          />

          <Box mt={2} mb={1}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.eod_run_when_closed}
                  onChange={e => onChange('eod_run_when_closed', e.target.checked)}
                  disabled
                />
              }
              label={
                <Typography color="text.secondary" fontWeight="600">
                  End of Day Process Run When Closed
                </Typography>
              }
            />
            {errors.eod_run_when_closed && (
              <FormHelperText error>{errors.eod_run_when_closed}</FormHelperText>
            )}
          </Box>

          <TextField
            fullWidth
            type="number"
            label="EOD Run After Close (mins)"
            name="eod_run_after_close_mins"
            value={formData.eod_run_after_close_mins}
            onChange={e => onChange('eod_run_after_close_mins', parseInt(e.target.value, 10))}
            error={!!errors.eod_run_after_close_mins}
            helperText={errors.eod_run_after_close_mins}
            inputProps={{ min: 0 }}
            margin="normal"
          />

          <Box mt={2}>
            <Typography variant="subtitle1" color="text.secondary" fontWeight="600" gutterBottom>
              Sales Channels
            </Typography>
            <TagInput
              value={formData.sales_channels ?? []}
              onChange={val => onChange('sales_channels', val)}
              placeholder="Add sales channels..."
            />
            {errors.sales_channels && (
              <FormHelperText error>{errors.sales_channels}</FormHelperText>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving} variant="contained" color="primary">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
