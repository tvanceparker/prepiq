import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  FormControlLabel,
  Radio,
  RadioGroup,
  Slider,
  Button,
  CircularProgress,
  Chip,
  Fade,
  LinearProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import dayjs from 'dayjs';

const getProgressMeta = (useCachedForecast: boolean, progress: number) => {
  const stages = useCachedForecast
    ? [
        { threshold: 0.25, label: 'Loading cached forecast snapshot' },
        { threshold: 0.65, label: 'Applying reorder rules' },
        { threshold: 1, label: 'Grouping supplier suggestions' },
      ]
    : [
        { threshold: 0.2, label: 'Running fresh forecast' },
        { threshold: 0.55, label: 'Breaking demand into ingredients' },
        { threshold: 0.85, label: 'Applying reorder rules' },
        { threshold: 1, label: 'Grouping supplier suggestions' },
      ];

  return stages.find(stage => progress <= stage.threshold)?.label ?? 'Finalizing suggestions';
};

interface POSupplierConfigProps {
  useCachedForecast: boolean;
  setUseCachedForecast: (value: boolean) => void;
  horizonDays: number;
  setHorizonDays: (value: number) => void;
  lastEodDate: string | null | undefined;
  onGenerate: () => void;
  onGenerateFresh: () => void;
  isGenerating: boolean;
}

export default function POSupplierConfig({
  useCachedForecast,
  setUseCachedForecast,
  horizonDays,
  setHorizonDays,
  lastEodDate,
  onGenerate,
  onGenerateFresh,
  isGenerating,
}: POSupplierConfigProps) {
  const [estimatedProgress, setEstimatedProgress] = React.useState(0);

  React.useEffect(() => {
    if (!isGenerating) {
      setEstimatedProgress(0);
      return;
    }

    const startedAt = Date.now();
    const durationMs = useCachedForecast ? 6000 : 18000;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / durationMs, 0.92);
      setEstimatedProgress(ratio);
    }, 150);

    return () => window.clearInterval(interval);
  }, [isGenerating, useCachedForecast]);

  const progressLabel = React.useMemo(
    () => getProgressMeta(useCachedForecast, estimatedProgress),
    [estimatedProgress, useCachedForecast]
  );

  const progressPercent = Math.max(5, Math.round(estimatedProgress * 100));

  return (
    <Fade in timeout={300}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Forecast Source
          </Typography>
          <RadioGroup
            value={useCachedForecast ? 'cached' : 'fresh'}
            onChange={e => setUseCachedForecast(e.target.value === 'cached')}
          >
            <Paper sx={{ p: 2, mb: 1, cursor: 'pointer' }} variant="outlined">
              <FormControlLabel
                value="cached"
                control={<Radio />}
                sx={{ m: 0, width: '100%' }}
                label={
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      Use Last EOD Forecast
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Faster • Based on most recent end-of-day analysis
                      {lastEodDate && (
                        <Chip
                          size="small"
                          label={dayjs(lastEodDate).format('MMM D, YYYY')}
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  </Box>
                }
              />
            </Paper>
            <Paper sx={{ p: 2, cursor: 'pointer' }} variant="outlined">
              <FormControlLabel
                value="fresh"
                control={<Radio />}
                sx={{ m: 0, width: '100%' }}
                label={
                  <Box sx={{ ml: 1 }}>
                    <Typography variant="body1" fontWeight={500}>
                      Generate Fresh Forecast
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      More accurate • Takes longer to compute
                    </Typography>
                  </Box>
                }
              />
            </Paper>
          </RadioGroup>
        </Box>

        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Planning Horizon
          </Typography>
          <Paper sx={{ p: 3 }} variant="outlined">
            <Stack direction="row" alignItems="center" spacing={2}>
              <AccessTimeIcon color="action" />
              <Slider
                value={horizonDays}
                onChange={(_, v) => setHorizonDays(v as number)}
                min={1}
                max={14}
                marks={[
                  { value: 1, label: '1 day' },
                  { value: 7, label: '7 days' },
                  { value: 14, label: '14 days' },
                ]}
                valueLabelDisplay="on"
                valueLabelFormat={v => `${v}d`}
                sx={{ flex: 1 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              How far ahead to forecast demand and calculate order quantities
            </Typography>
          </Paper>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            variant="contained"
            size="large"
            startIcon={
              isGenerating ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />
            }
            onClick={onGenerate}
            disabled={isGenerating}
            sx={{ py: 1.5, flex: 1 }}
          >
            {isGenerating
              ? 'Generating Suggestions...'
              : useCachedForecast
                ? 'Generate Cached Suggestions'
                : 'Generate Fresh Suggestions'}
          </Button>
          {useCachedForecast && (
            <Button
              variant="outlined"
              size="large"
              onClick={onGenerateFresh}
              disabled={isGenerating}
              sx={{ py: 1.5, flex: 1 }}
            >
              Run Fresh Preview
            </Button>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Generate Suggestions uses the forecast source selected above. Run Fresh Preview is just a
          shortcut that flips to a live forecast and starts it immediately.
        </Typography>

        {isGenerating && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.25}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  {progressLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {progressPercent}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progressPercent}
                sx={{ height: 8, borderRadius: 999 }}
              />
              <Typography variant="caption" color="text.secondary">
                Estimated progress only. If the request is interrupted, nothing is saved and you can
                rerun it safely.
              </Typography>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Fade>
  );
}
