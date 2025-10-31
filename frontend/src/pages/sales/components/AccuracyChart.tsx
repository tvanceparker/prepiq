import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Box, Typography, useTheme } from '@mui/material';

const AccuracyChart = ({ data }) => {
  const theme = useTheme();

  if (!data.length) {
    return (
      <Box mb={6}>
        <Typography variant="h6" sx={{ mb: 1 }} color={theme.palette.text.primary}>
          Daily Accuracy Chart
        </Typography>
        <Typography color={theme.palette.text.secondary}>No data to display.</Typography>
      </Box>
    );
  }

  const menuItems = Array.from(new Set(data.map(d => d.menu_item_name)));

  const groupedByDate = data.reduce(
    (acc, { date, menu_item_name, error_percentage }) => {
      if (!acc[date]) acc[date] = { date };
      acc[date][menu_item_name] = Math.max(0, 100 - (error_percentage || 0));
      return acc;
    },
    {} as Record<string, any>
  );

  const chartData = Object.values(groupedByDate).sort((a: any, b: any) =>
    a.date > b.date ? 1 : -1
  );

  const colors = [
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.primary.main,
    theme.palette.secondary.main,
  ];

  return (
    <Box mb={6} sx={{ width: '100%', height: 300 }}>
      <Typography variant="h6" sx={{ mb: 1 }} color={theme.palette.text.primary}>
        Daily Accuracy Chart (Accuracy %)
      </Typography>

      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis
            dataKey="date"
            tickFormatter={date => date.slice(5)} // MM-DD format
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
            stroke={theme.palette.text.primary}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={v => `${v}%`}
            stroke={theme.palette.text.primary}
          />
          <Tooltip
            formatter={(value: any) => `${Number(value).toFixed(2)}%`}
            labelFormatter={label => `Date: ${label}`}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
            }}
          />
          <Legend wrapperStyle={{ color: theme.palette.text.primary }} />
          {menuItems.map((itemName: string, idx: number) => (
            <Line
              key={itemName}
              type="monotone"
              dataKey={itemName}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AccuracyChart;
