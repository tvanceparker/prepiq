import React, { useState, useEffect, useMemo } from 'react';
import { useForecastAccuracy } from '../hooks/useForecastAccuracy';
import AccuracyChart from './AccuracyChart';
import AccuracyTable from './AccuracyTable';
import ComputedAccuracy from './ComputedAccuracy';
import FilterButtons from '../../../components/FilterButtons'; // Keep your existing component
import DateSelector from '../../../components/DateSelector';
import { PageHeader } from '../../../components/PageHeader';
import { Box, Typography, CircularProgress, Alert, Paper, Chip } from '@mui/material';

const formatDate = date => date.toISOString().split('T')[0];
const getDateNDaysAgo = n => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const getForecastSourceLabel = forecastState =>
  forecastState?.forecast_source_type === 'eod' ? 'EOD' : 'On-demand';

const formatForecastTimestamp = value => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
};

const formatConfidence = value => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}% confidence`;
};

const ForecastAccuracyBasic = () => {
  const [startDate, setStartDate] = useState(formatDate(getDateNDaysAgo(7)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));

  const {
    filteredChartData,
    filteredTableData,
    filteredComputedData,
    chartData,
    tableData,
    computedData,
    forecastState,
    selectedMenuItemIds,
    setSelectedMenuItemIds,
    loading,
    error,
  } = useForecastAccuracy(startDate, endDate);

  const allMenuItems = useMemo(() => {
    const combined = [...chartData, ...tableData, ...computedData];
    return Array.from(
      new Map(combined.map(({ menu_item_id, menu_item_name }) => [menu_item_id, menu_item_name]))
    );
  }, [chartData, tableData, computedData]);

  useEffect(() => {
    if (!selectedMenuItemIds.length && allMenuItems.length) {
      setSelectedMenuItemIds(allMenuItems.map(([id]) => id)); // Select all by default
    }
  }, [allMenuItems, selectedMenuItemIds, setSelectedMenuItemIds]);

  return (
    <Paper
      sx={{
        maxWidth: 1200,
        mt: 4,
        mx: 'auto',
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
      }}
    >
      {/* Heading */}
      <PageHeader title="📈 Forecast Accuracy" />

      {forecastState && (
        <Alert
          severity={
            forecastState.forecast_status === 'ready'
              ? 'info'
              : forecastState.forecast_status === 'failed'
                ? 'error'
                : 'warning'
          }
          variant="outlined"
          sx={{ mb: 3 }}
          action={
            <Chip
              size="small"
              variant="outlined"
              label={`${getForecastSourceLabel(forecastState)} · ${forecastState.forecast_status}`}
            />
          }
        >
          <Typography variant="body2" fontWeight={600}>
            {forecastState.forecast_status_message}
          </Typography>
          {forecastState.forecast_generated_at && (
            <Typography variant="caption" display="block">
              {forecastState.forecast_reused ? 'Reused' : 'Generated'}{' '}
              {getForecastSourceLabel(forecastState)} forecast on{' '}
              {formatForecastTimestamp(forecastState.forecast_generated_at)}
            </Typography>
          )}
          {(forecastState.forecast_version ||
            forecastState.forecast_confidence_score !== undefined) && (
            <Typography variant="caption" display="block">
              {forecastState.forecast_version
                ? `Version ${forecastState.forecast_version}`
                : 'Version n/a'}
              {formatConfidence(forecastState.forecast_confidence_score)
                ? ` · ${formatConfidence(forecastState.forecast_confidence_score)}`
                : ''}
            </Typography>
          )}
        </Alert>
      )}

      {/* Date Selector */}
      <Box maxWidth={480} mx="auto" mb={4}>
        <DateSelector
          label="Select Date Range"
          startDate={new Date(startDate)}
          endDate={new Date(endDate)}
          onStartDateChange={date => setStartDate(formatDate(date))}
          onEndDateChange={date => setEndDate(formatDate(date))}
          mode="range"
          direction="backward"
        />
      </Box>

      {/* Filter Buttons */}
      <Box mb={6}>
        <FilterButtons
          items={allMenuItems.map(([id, name]) => ({ id, name }))}
          selectedItems={selectedMenuItemIds}
          setSelectedItems={setSelectedMenuItemIds}
          label="Filter by Menu Items"
          allLabel="All Menu Items"
        />
      </Box>

      {/* Loading & Error */}
      {loading && (
        <Box mb={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Box mb={4}>
          <Alert severity="error" variant="outlined">
            {error}
          </Alert>
        </Box>
      )}

      {/* Sections */}
      <Box
        mb={6}
        p={3}
        component={Paper}
        elevation={1}
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderColor: 'divider',
          borderStyle: 'solid',
          borderWidth: 1,
        }}
      >
        <AccuracyChart data={filteredChartData} />
      </Box>

      <Box
        mb={6}
        p={3}
        component={Paper}
        elevation={1}
        sx={{
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderColor: 'divider',
          borderStyle: 'solid',
          borderWidth: 1,
        }}
      >
        <AccuracyTable data={filteredTableData} />
      </Box>
    </Paper>
  );
};

export default ForecastAccuracyBasic;
