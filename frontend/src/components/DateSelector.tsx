import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Button,
  Paper,
  ClickAwayListener,
  Grow,
  Popper,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import type { DateSelectorProps } from '../interfaces/ui';

const presets = [
  { label: 'Today', days: 0 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function DateSelector({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  mode = 'range',
  direction = 'forward',
  sx = {},
}: DateSelectorProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  const handlePresetClick = (days: number) => {
    const today = startOfDay(new Date());

    if (direction === 'forward') {
      onStartDateChange(today);
      onEndDateChange(addDays(today, days > 0 ? days - 1 : 0));
    } else {
      onStartDateChange(addDays(today, days > 0 ? -(days - 1) : 0));
      onEndDateChange(today);
    }
    setOpen(false);
  };

  const mainLabel = direction === 'forward' ? '→ Days' : '← Days';

  const handleToggle = () => {
    setOpen(prev => !prev);
  };

  const handleClickAway = () => {
    setOpen(false);
  };

  const startMax = mode === 'range' && direction === 'forward' ? formatDate(endDate) : undefined;
  const endMin = mode === 'range' && direction === 'forward' ? formatDate(startDate) : undefined;

  return (
    <Box sx={{ width: '100%', position: 'relative', ...sx }}>
      {label && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>

          {mode !== 'single' && (
            <>
              <Button
                ref={anchorRef}
                onClick={handleToggle}
                variant="outlined"
                size="small"
                sx={{
                  minWidth: 64,
                  borderRadius: '50px',
                  padding: '4px 12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  bgcolor: 'background.paper',
                  borderColor: 'grey.400',
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'grey.100', borderColor: 'grey.600' },
                }}
              >
                {mainLabel}
              </Button>

              <Popper
                open={open}
                anchorEl={anchorRef.current}
                placement="right-start"
                transition
                disablePortal
                style={{ zIndex: 1300 }}
              >
                {({ TransitionProps }) => (
                  <Grow {...TransitionProps} style={{ transformOrigin: 'left top' }}>
                    <Paper
                      elevation={3}
                      sx={{ mt: 1, borderRadius: 2, overflow: 'hidden', minWidth: 120 }}
                    >
                      <ClickAwayListener onClickAway={handleClickAway}>
                        <List dense disablePadding>
                          {presets.map(preset => (
                            <ListItemButton
                              key={preset.label}
                              onClick={() => handlePresetClick(preset.days)}
                              sx={{
                                px: 2,
                                py: 1,
                                '&:not(:last-child)': {
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                },
                              }}
                            >
                              <ListItemText
                                primary={
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {direction === 'forward'
                                      ? `Next ${preset.label}`
                                      : `Previous ${preset.label}`}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          ))}
                        </List>
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
                )}
              </Popper>
            </>
          )}
        </Box>
      )}

      {mode === 'range' && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
          <TextField
            label="Start Date"
            type="date"
            value={formatDate(startDate)}
            onChange={e => onStartDateChange(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: startMax }}
            fullWidth
          />
          <TextField
            label="End Date"
            type="date"
            value={formatDate(endDate)}
            onChange={e => onEndDateChange(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: endMin }}
            fullWidth
          />
        </Stack>
      )}
      {mode === 'single' && (
        <Box maxWidth={250} mx="auto" mb={2}>
          <TextField
            label="Select Date"
            type="date"
            value={formatDate(startDate)}
            onChange={e => onStartDateChange(new Date(e.target.value))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>
      )}
    </Box>
  );
}
