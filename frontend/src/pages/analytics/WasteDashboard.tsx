import React from 'react';
import { Box, Card, CardContent, Chip, Divider, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import { useWasteDashboard } from './hooks/useWasteDashboard';

const currency = (value: number) => `$${(value ?? 0).toFixed(2)}`;

function WasteDashboard() {
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    typeFilter,
    setTypeFilter,
    query,
    data,
    filteredTrend,
    topInsights,
    setQuickRange,
  } = useWasteDashboard();

  const chartData = {
    labels: filteredTrend.map(p => p.bucket_start),
    datasets: [
      {
        label: 'Waste cost ($)',
        data: filteredTrend.map(p => p.total_cost),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const loading = query.isLoading || query.isFetching;

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Waste Dashboard
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1} alignItems="center">
            {[30, 60, 90].map(days => (
              <Chip key={days} label={`Last ${days}d`} variant="outlined" onClick={() => setQuickRange(days)} />
            ))}
            <Chip
              label="All"
              color={typeFilter === 'all' ? 'primary' : 'default'}
              variant={typeFilter === 'all' ? 'filled' : 'outlined'}
              onClick={() => setTypeFilter('all')}
            />
            {data?.by_type.map(t => (
              <Chip
                key={t.key}
                label={t.label}
                color={typeFilter === t.usage_type ? 'primary' : 'default'}
                variant={typeFilter === t.usage_type ? 'filled' : 'outlined'}
                onClick={() => setTypeFilter(t.usage_type || 'all')}
              />
            ))}
            <Box sx={{ flexGrow: 1 }} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Total waste cost
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {currency(data?.total_waste_cost ?? 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Avg daily {currency(data?.average_daily_cost ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Total waste qty
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {(data?.total_waste_quantity ?? 0).toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {startDate} → {endDate}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Top driver
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {data?.top_ingredients?.[0]?.label || 'Pending data'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {data?.top_ingredients?.[0]
                  ? `${currency(data.top_ingredients[0].total_cost)} cost`
                  : 'Add waste logs to see insights'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">Waste trend</Typography>
            {loading && <LinearProgress sx={{ width: 120 }} />}
          </Stack>
          {filteredTrend.length === 0 ? (
            <Typography color="text.secondary">No waste logged for this range.</Typography>
          ) : (
            <Line data={chartData} />
          )}
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                By type
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {(data?.by_type || []).map(row => (
                  <Stack key={row.key} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography>{row.label}</Typography>
                    <Typography color="text.secondary">
                      {currency(row.total_cost)} · {row.total_quantity.toFixed(2)}
                    </Typography>
                  </Stack>
                ))}
                {!data?.by_type?.length && (
                  <Typography color="text.secondary">No data.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top ingredients
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {(data?.top_ingredients || []).map(row => (
                  <Stack key={row.key} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography>{row.label}</Typography>
                    <Typography color="text.secondary">
                      {currency(row.total_cost)} · {row.total_quantity.toFixed(2)}
                    </Typography>
                  </Stack>
                ))}
                {!data?.top_ingredients?.length && (
                  <Typography color="text.secondary">No data.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top reasons
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {(data?.top_reasons || []).map(row => (
                  <Stack key={row.key} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography>{row.label}</Typography>
                    <Typography color="text.secondary">
                      {currency(row.total_cost)} · {row.total_quantity.toFixed(2)}
                    </Typography>
                  </Stack>
                ))}
                {!data?.top_reasons?.length && (
                  <Typography color="text.secondary">No data.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Insights & optimization
              </Typography>
              <Stack spacing={1} divider={<Divider flexItem />}>
                {topInsights.map((insight, idx) => (
                  <Box key={idx}>
                    <Typography fontWeight={700}>{insight.title}</Typography>
                    <Typography color="text.secondary">{insight.detail}</Typography>
                    {insight.action && (
                      <Typography variant="caption" color="primary">
                        {insight.action}
                      </Typography>
                    )}
                  </Box>
                ))}
                {!topInsights.length && <Typography color="text.secondary">No insights yet.</Typography>}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default WasteDashboard;
