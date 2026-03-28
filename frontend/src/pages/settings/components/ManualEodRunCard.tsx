import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Alert,
  Avatar,
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Autorenew as EodRunIcon } from '@mui/icons-material';
import Button from '../../../components/Button';
import { finalizeEod } from '../../../api/eod';
import { getLastEodDate } from '../../../api/inventory';
import { useUIStore } from '../../../stores/uiStore';

export default function ManualEodRunCard() {
  const theme = useTheme();
  const showSnackbar = useUIStore(state => state.showSnackbar);
  const [eodDate, setEodDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [forceRerun, setForceRerun] = useState(false);
  const [hasInitializedDate, setHasInitializedDate] = useState(false);

  const { data: lastEodData } = useQuery({
    queryKey: ['settings_last_eod_date'],
    queryFn: getLastEodDate,
  });

  useEffect(() => {
    if (!hasInitializedDate && lastEodData?.last_eod_run_date) {
      setEodDate(lastEodData.last_eod_run_date);
      setHasInitializedDate(true);
    }
  }, [hasInitializedDate, lastEodData?.last_eod_run_date]);

  const finalizeMutation = useMutation({
    mutationFn: ({ selectedDate, force }: { selectedDate: string; force: boolean }) =>
      finalizeEod(selectedDate, force),
    onSuccess: (_, variables) => {
      setForceRerun(false);
      showSnackbar(
        variables.force
          ? `Manual EOD rerun started for ${variables.selectedDate}.`
          : `Manual EOD started for ${variables.selectedDate}.`,
        'success'
      );
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || error?.message || 'Unknown error';
      showSnackbar(`Failed to start EOD: ${message}`, 'error');
    },
  });

  const handleRun = async () => {
    if (!eodDate) {
      showSnackbar('Choose an EOD business date first.', 'warning');
      return;
    }

    await finalizeMutation.mutateAsync({ selectedDate: eodDate, force: forceRerun });
  };

  const lastEodDate = lastEodData?.last_eod_run_date ?? null;
  const isRerunDate = !!lastEodDate && eodDate === lastEodDate;

  return (
    <Box
      sx={{
        mt: 3,
        p: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.warning.main, 0.04),
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Avatar
          sx={{
            bgcolor: alpha(theme.palette.warning.main, 0.12),
            color: theme.palette.warning.dark,
            width: 48,
            height: 48,
          }}
        >
          <EodRunIcon />
        </Avatar>
        <Box flex={1}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Manual End of Day Run
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start the EOD pipeline for a specific business date. Force rerun is manual-only and
            resets the ledger before rerunning that date.
          </Typography>
        </Box>
      </Stack>

      <Stack spacing={2} mt={2.5}>
        <TextField
          label="EOD Business Date"
          type="date"
          value={eodDate}
          onChange={event => {
            setHasInitializedDate(true);
            setEodDate(event.target.value);
          }}
          InputLabelProps={{ shrink: true }}
          sx={{ maxWidth: 260 }}
        />

        <Alert severity="info">
          Last completed EOD:{' '}
          {lastEodDate
            ? dayjs(lastEodDate).format('MMM D, YYYY')
            : 'No completed run recorded yet.'}
        </Alert>

        <FormControlLabel
          control={
            <Checkbox
              checked={forceRerun}
              onChange={event => setForceRerun(event.target.checked)}
            />
          }
          label="Force rerun this date"
        />

        {forceRerun ? (
          <Alert severity="warning">
            This is for intentional manual reruns only. It resets the EOD ledger for the selected
            date before rerunning the pipeline.
          </Alert>
        ) : isRerunDate ? (
          <Alert severity="info">
            The selected date matches the last completed EOD date. Leave force off to use normal
            idempotent stage guards, or enable it if you intentionally need a full manual rerun.
          </Alert>
        ) : (
          <Alert severity="success">
            This starts a normal manual EOD run in the background for the selected date.
          </Alert>
        )}

        <Box>
          <Button
            variant={forceRerun ? 'confirm' : 'contained'}
            onClick={handleRun}
            disabled={finalizeMutation.isPending || !eodDate}
            requiredPermission="restaurant_settings"
          >
            {finalizeMutation.isPending
              ? 'Starting EOD...'
              : forceRerun
                ? 'Start Forced EOD Rerun'
                : 'Start Manual EOD'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
