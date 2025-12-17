import React from 'react';
import { Box, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import { useInsightsOptimization } from './hooks/useInsightsOptimization';

const severityColorMap: Record<string, string> = {
  critical: '#fecdd3',
  warning: '#fef9c3',
  success: '#dcfce7',
  info: '#dbeafe',
};

function InsightsOptimization() {
  const { startDate, endDate, setStartDate, setEndDate, query, insights, setQuickRange } =
    useInsightsOptimization();

  const loading = query.isLoading || query.isFetching;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Insights & Optimization
      </Typography>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={1}>
            {[14, 30, 60].map(days => (
              <Chip
                key={days}
                label={`Last ${days}d`}
                variant="outlined"
                onClick={() => setQuickRange(days)}
              />
            ))}
            <Box sx={{ flexGrow: 1 }} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            {loading && <LinearProgress sx={{ width: 120 }} />}
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {insights.length === 0 && !loading && (
          <Typography color="text.secondary">No insights to display for this window.</Typography>
        )}
        {insights.map((insight, idx) => (
          <Card
            key={`${insight.title}-${idx}`}
            sx={{
              borderLeft: '4px solid #2563eb',
              backgroundColor: severityColorMap[insight.severity] || '#f3f4f6',
            }}
          >
            <CardContent>
              <Typography variant="h6">{insight.title}</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {insight.detail}
              </Typography>
              {insight.action && (
                <Typography variant="body2" color="primary">
                  {insight.action}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}

export default InsightsOptimization;
