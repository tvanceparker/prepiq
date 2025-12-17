import React, { useMemo } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useIngredientCostTrends } from './hooks/useIngredientCostTrends';
import { IngredientCostTrendsResponse } from '../../interfaces/analytics';

const palette = [
  '#2563eb',
  '#fb7185',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#0ea5e9',
  '#ef4444',
  '#14b8a6',
];

const currency = (value: number) =>
  `$${(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const toDateLabel = (value: string | number) =>
  new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function StatCard({ title, value, helper }: { title: string; value: string; helper?: string }) {
  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: 'white',
      }}
    >
      <CardContent>
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>
          {value}
        </Typography>
        {helper && (
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {helper}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function IngredientTrends() {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    granularity,
    setGranularity,
    ingredientIds,
    setIngredientIds,
    supplierIds,
    setSupplierIds,
    query,
    chartData,
    labeledSeries,
    availableIngredients,
    availableSuppliers,
    topMovers,
    setQuickRangeDays,
  } = useIngredientCostTrends();

  const data = query.data as IngredientCostTrendsResponse | undefined;

  const isLoading = query.isLoading || query.isFetching;
  const seriesForLegend = useMemo(
    () =>
      labeledSeries.map((series, index) => ({
        ...series,
        color: palette[index % palette.length],
      })),
    [labeledSeries]
  );

  const headline = useMemo(() => {
    const total = currency(data?.total_cost || 0);
    const count = data?.series.length || 0;
    const scope = granularity === 'daily' ? 'day' : 'week';
    return `${total} spent across ${count} tracked ingredients (${scope} buckets)`;
  }, [granularity, query.data]);

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      <Stack spacing={3}>
        <Card
          sx={{ borderRadius: 3, boxShadow: '0 20px 60px rgba(15,23,42,0.12)', overflow: 'hidden' }}
        >
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="overline" color="primary" sx={{ letterSpacing: 1.2 }}>
              Profit & Waste Analytics
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Ingredient Cost Trends
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track delivered ingredient costs over time using finalized purchase orders. Switch
              between daily and weekly buckets, filter by suppliers, and spotlight the risers and
              fallers.
            </Typography>
            <Typography variant="subtitle2" color="text.primary" sx={{ mt: 1, fontWeight: 600 }}>
              {headline}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
              >
                <TextField
                  label="Start date"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <TextField
                  label="End date"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  size="small"
                />
                <Stack direction="row" spacing={1}>
                  {[30, 60, 90].map(days => (
                    <Chip
                      key={days}
                      label={`Last ${days}d`}
                      variant="outlined"
                      onClick={() => setQuickRangeDays(days)}
                    />
                  ))}
                </Stack>
                <ToggleButtonGroup
                  exclusive
                  value={granularity}
                  onChange={(_, val) => val && setGranularity(val)}
                  size="small"
                  color="primary"
                >
                  <ToggleButton value="daily">Daily</ToggleButton>
                  <ToggleButton value="weekly">Weekly</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <Autocomplete
                  multiple
                  options={availableIngredients}
                  getOptionLabel={option => option.name}
                  value={availableIngredients.filter(opt => ingredientIds.includes(opt.id))}
                  onChange={(_, value) => setIngredientIds(value.map(v => v.id))}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Filter ingredients"
                      placeholder="All"
                      size="small"
                    />
                  )}
                  sx={{ flex: 1, minWidth: 240 }}
                />
                <Autocomplete
                  multiple
                  options={availableSuppliers}
                  getOptionLabel={option => option.name}
                  value={availableSuppliers.filter(opt => supplierIds.includes(opt.id))}
                  onChange={(_, value) => setSupplierIds(value.map(v => v.id))}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Filter suppliers"
                      placeholder="All"
                      size="small"
                    />
                  )}
                  sx={{ flex: 1, minWidth: 240 }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Total spend"
              value={currency(data?.total_cost || 0)}
              helper="Based on delivered purchase orders"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Active ingredients"
              value={`${data?.series.length || 0}`}
              helper="With at least one delivered line"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <StatCard
              title="Granularity"
              value={granularity === 'daily' ? 'Daily buckets' : 'Weekly buckets'}
              helper="Delivered date drives bucket start"
            />
          </Grid>
        </Grid>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Cost over time
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {granularity === 'daily' ? 'Daily delivered cost' : 'Week-start buckets'}
              </Typography>
            </Stack>
            {query.isError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {query.error instanceof Error ? query.error.message : 'Unable to load cost trends.'}
              </Alert>
            )}
            {isLoading ? (
              <Stack alignItems="center" sx={{ py: 8 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Crunching purchase orders…
                </Typography>
              </Stack>
            ) : chartData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No delivered purchase order items in the selected range.
              </Typography>
            ) : (
              <Box sx={{ width: '100%', height: 420 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="bucket_start" tickFormatter={toDateLabel} stroke="#475569" />
                    <YAxis
                      tickFormatter={value => currency(Number(value))}
                      stroke="#475569"
                      width={90}
                    />
                    <Tooltip
                      formatter={(value: number) => currency(Number(value))}
                      labelFormatter={value => `${toDateLabel(value)} (${granularity})`}
                    />
                    <Legend />
                    {seriesForLegend.map(series => (
                      <Line
                        key={series.label}
                        type="monotone"
                        dataKey={series.label}
                        stroke={series.color}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={7}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Top movers
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Biggest percentage shifts from first to last bucket.
                </Typography>
                <Stack spacing={1.5}>
                  {topMovers.map(mover => (
                    <Stack
                      key={mover.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {mover.name}
                        </Typography>
                        {mover.supplier && (
                          <Typography variant="caption" color="text.secondary">
                            {mover.supplier}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={`${mover.changePct >= 0 ? '+' : ''}${mover.changePct.toFixed(1)}%`}
                        color={mover.changePct >= 0 ? 'error' : 'success'}
                        variant="outlined"
                        sx={{ minWidth: 90, textAlign: 'center' }}
                      />
                    </Stack>
                  ))}
                  {topMovers.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Not enough data yet to calculate movers.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Series snapshot
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Stack spacing={1.25}>
                  {seriesForLegend.map(series => (
                    <Stack
                      key={series.ingredient_id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box
                          sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: series.color }}
                        />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {series.label}
                          </Typography>
                          {series.supplier_name && (
                            <Typography variant="caption" color="text.secondary">
                              Supplier: {series.supplier_name}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                      <Stack sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2">{currency(series.total_cost)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {series.points.length} buckets
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                  {seriesForLegend.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Select filters to populate series.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Box>
  );
}

export default IngredientTrends;
