import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Treemap, ResponsiveContainer } from 'recharts';
import { Box, Typography, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const COLORS = ['#0fb9b1', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

const breakdownOptions = [
  { id: 'menu_item_name', name: 'Menu Item' },
  { id: 'category', name: 'Category' },
  { id: 'sales_channel', name: 'Sales Channel' },
];

export default function SalesBreakdownChart({ data, byRevenue }) {
  const theme = useTheme();
  const [breakdownType, setBreakdownType] = useState('menu_item_name');
  const [chartType, setChartType] = useState('pie');

  const transformedData = useMemo(() => {
    if (!data?.length) return [];

    const grouped = data.reduce(
      (acc, item) => {
        const key = item[breakdownType];
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + item.metric;
        return acc;
      },
      {} as Record<string, number>
    );

    const values: number[] = Object.values(grouped);
    const total: number = values.reduce((sum: number, v: number) => sum + v, 0) || 1;

    return Object.entries(grouped).map(([name, metric]: [string, number]) => ({
      name,
      metric: Number(metric.toFixed(2)),
      percent_of_total: Number(((metric / total) * 100).toFixed(2)),
    }));
  }, [data, breakdownType]);

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: 2,
        p: 3,
        boxShadow: theme.shadows[1],
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <Typography variant="h6" component="h2">
          Sales Breakdown – {byRevenue ? 'Revenue $' : 'Quantity'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {breakdownOptions.map(({ id, name }) => (
            <Button
              key={id}
              variant={breakdownType === id ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setBreakdownType(id)}
            >
              {name}
            </Button>
          ))}
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={() => setChartType(chartType === 'pie' ? 'treemap' : 'pie')}
        >
          {chartType === 'pie' ? 'Treemap' : 'Pie'}
        </Button>
      </Box>

      {!transformedData.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No breakdown data available.
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={transformedData}
                dataKey="percent_of_total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
              >
                {transformedData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  borderColor: 'transparent',
                  color: theme.palette.text.primary,
                }}
              />
            </PieChart>
          ) : (
            <Treemap
              data={transformedData}
              dataKey="metric"
              nameKey="name"
              stroke="#fff"
              fill="#3b82f6"
            />
          )}
        </ResponsiveContainer>
      )}
    </Box>
  );
}
