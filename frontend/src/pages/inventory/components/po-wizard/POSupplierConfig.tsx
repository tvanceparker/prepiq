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
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import dayjs from 'dayjs';

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
            {isGenerating ? 'Generating Suggestions...' : 'Generate Order Suggestions'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={onGenerateFresh}
            disabled={isGenerating}
            sx={{ py: 1.5, flex: 1 }}
          >
            Run Fresh Preview
          </Button>
        </Stack>
      </Stack>
    </Fade>
  );
}
