import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MaterialReactTable } from 'material-react-table';
import DateSelector from '../../../components/DateSelector';
import Button from '../../../components/Button';
import { useUpcomingForecast } from '../hooks/useUpcomingForecast';
import { PageHeader } from '../../../components/PageHeader';

function getDayRange(start, end) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round((end - start) / msPerDay) + 1);
}

function formatDate(dateInput) {
  if (!dateInput) return '';

  if (typeof dateInput === 'string') {
    // dateInput is string like "2025-07-09"
    const [year, month, day] = dateInput.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (dateInput instanceof Date) {
    // dateInput is a Date object
    return dateInput.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // fallback: if something else is passed
  return '';
}

function getForecastSourceLabel(forecastState) {
  return forecastState?.forecast_source_type === 'eod' ? 'EOD' : 'On-demand';
}

function formatForecastTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
}

function formatConfidence(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${Math.round(value * 100)}% confidence`;
}

export default function BasicUpcomingForecast() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const today = new Date();
  const defaultEnd = new Date(today);
  defaultEnd.setDate(defaultEnd.getDate() + 2);

  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    mode,
    setMode,
    forecastTable,
    forecastTotals,
    topItems,
    forecastState,
    loading,
    error,
  } = useUpcomingForecast(today, defaultEnd);

  const dayRange = getDayRange(startDate, endDate);
  const formattedRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;

  // Columns definition for Material React Table
  const columns = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        enableGrouping: true,
        Cell: ({ cell }) => formatDate(cell.getValue()),
      },
      {
        accessorKey: 'menu_item_name',
        header: 'Menu Item',
      },
      {
        accessorKey: 'forecasted_quantity',
        header: 'Forecasted Quantity',
        enableSorting: true,
        size: 80,
        Cell: ({ cell }) => cell.getValue(),
      },
    ],
    []
  );

  // Summarize total items when mode is "total"
  const totalItemsSummary = useMemo(() => {
    if (mode !== 'total' || !Array.isArray(forecastTable)) return null;
    const itemSums = {};
    forecastTable.forEach(({ menu_item_name, forecasted_quantity }) => {
      if (!menu_item_name) return;
      itemSums[menu_item_name] = (itemSums[menu_item_name] || 0) + forecasted_quantity;
    });
    return Object.entries(itemSums).map(([name, quantity]) => ({
      name,
      quantity,
    }));
  }, [forecastTable, mode]);

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
      <PageHeader
        eyebrow="Sales and forecasting"
        title={`Forecast for Next ${dayRange} Day${dayRange > 1 ? 's' : ''}`}
        description="Review near-term demand, compare forecast totals across the selected date range, and keep the underlying forecast state visible while planning work."
        icon={<QueryStatsOutlinedIcon />}
      />

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

      {/* Controls */}
      <Paper elevation={3} sx={{ py: 2, px: 4, mb: 5, borderRadius: 2 }}>
        <Stack
          direction={isMobile ? 'column' : 'row'}
          spacing={3}
          alignItems="center"
          justifyContent="space-between"
        >
          <DateSelector
            label="Forecast Date Range"
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            mode="range"
          />

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">Mode:</Typography>
            <Button
              variant={(mode === 'per_day' ? 'primary' : 'muted') as any}
              onClick={() => setMode('per_day')}
            >
              Per Day
            </Button>
            <Button
              variant={(mode === 'total' ? 'primary' : 'muted') as any}
              onClick={() => setMode('total')}
            >
              Full Range
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Forecast Totals and Chart */}
      {!loading && !error && (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={4} mb={6}>
          <Card
            elevation={4}
            sx={{
              maxHeight: 400,
              overflowY: 'auto',
              position: 'relative',
              px: 4,
              py: 2,
            }}
          >
            <Typography
              variant="h6"
              fontWeight={600}
              mb={2}
              sx={{
                position: 'sticky',
                top: 0,
                bgcolor: theme.palette.background.paper,
                zIndex: 10,
                py: 1,
              }}
            >
              📊 Forecast Totals ({formattedRange})
            </Typography>

            {mode === 'per_day' ? (
              !forecastTotals || (forecastTotals as any[]).length === 0 ? (
                <Typography>No forecast totals available.</Typography>
              ) : (
                (forecastTotals as any[]).map(
                  ({ date, forecasted_quantity, forecasted_revenue }) => (
                    <Box key={date} sx={{ mb: 1 }}>
                      <Typography
                        fontWeight={600}
                        sx={{
                          position: 'sticky',
                          top: 40,
                          bgcolor: theme.palette.background.paper,
                          zIndex: 5,
                          py: 0.5,
                        }}
                      >
                        {formatDate(date)}: {forecasted_quantity} items — $
                        {typeof forecasted_revenue === 'number'
                          ? forecasted_revenue.toFixed(2)
                          : '0.00'}
                      </Typography>
                      <Stack pl={2} mt={0.5}>
                        {forecastTable
                          .filter(item => item.date === date)
                          .map(({ menu_item_name, forecasted_quantity }) => (
                            <Typography key={menu_item_name} variant="body2" color="text.secondary">
                              • {menu_item_name}: {forecasted_quantity}
                            </Typography>
                          ))}
                      </Stack>
                    </Box>
                  )
                )
              )
            ) : (
              <>
                <Typography fontWeight={600}>
                  Total Items: {(forecastTotals as any)?.forecasted_quantity ?? 0}
                </Typography>
                <Typography fontWeight={600}>
                  Total Revenue: ${((forecastTotals as any)?.forecasted_revenue ?? 0).toFixed(2)}
                </Typography>
                {totalItemsSummary && totalItemsSummary.length > 0 && (
                  <Stack pl={1} mt={1}>
                    {totalItemsSummary.map(({ name, quantity }) => (
                      <Typography key={name} variant="body2" color="text.secondary">
                        • {name}: {quantity as any}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </>
            )}
          </Card>

          <Card elevation={4}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} mb={2}>
                🔝 Top Forecasted Items ({formattedRange})
              </Typography>
              {topItems.length === 0 ? (
                <Typography>No top items data available.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topItems}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="forecasted_quantity" fill={theme.palette.primary.main} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Forecast Breakdown Table with Material React Table */}
      {!loading && !error && (
        <>
          <Divider sx={{ my: 6 }} />
          <Typography variant="h6" fontWeight={600} mb={2} textAlign="center">
            📅 Forecast Breakdown Table (Next {dayRange} Day
            {dayRange > 1 ? 's' : ''})
          </Typography>

          <MaterialReactTable
            columns={columns}
            data={forecastTable}
            enableGrouping
            enableStickyHeader
            enableColumnFilters
            enableGlobalFilter
            initialState={{
              density: 'compact',
              grouping: ['date'],
            }}
            muiTableContainerProps={{
              sx: { maxHeight: 400 },
            }}
            localization={{
              noRecordsToDisplay: 'No forecast data for selected dates.',
            }}
            muiTableBodyRowProps={({ row }) => ({
              onClick: row.getIsGrouped() ? () => row.toggleExpanded() : undefined,
              style: {
                cursor: row.getIsGrouped() ? 'pointer' : 'default',
                backgroundColor: row.getIsGrouped() ? '#f5f5f5' : undefined,
              },
            })}
          />
        </>
      )}

      {/* Loading & Error */}
      {loading && (
        <Box textAlign="center" py={6}>
          <CircularProgress />
          <Typography mt={2} color="text.secondary">
            Calculating forecast...
          </Typography>
        </Box>
      )}

      {error && (
        <Typography textAlign="center" color={theme.palette.error.main} mt={6}>
          Error loading forecast: {error.message}
        </Typography>
      )}
    </Paper>
  );
}
