import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
} from 'chart.js';
import { Typography, useTheme, Box } from '@mui/material';

ChartJS.register(LineElement, PointElement, LinearScale, Title, Tooltip, Legend, CategoryScale);

export default function SalesPatternsOverTimeChart({ data }) {
  const theme = useTheme();

  // Always call hooks first
  const menuItems = useMemo(
    () => (data ? [...new Set(data.map(d => d.menu_item_name))] : []),
    [data]
  );

  const groupedByDate = useMemo(() => {
    if (!data) return {};
    return data.reduce(
      (acc, curr) => {
        const dateKey =
          curr.date || curr.sale_timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10);
        if (!acc[dateKey]) acc[dateKey] = { date: dateKey };
        acc[dateKey][curr.menu_item_name] = curr.value || 0;
        return acc;
      },
      {} as Record<string, Record<string, any>>
    );
  }, [data]);

  const chartData = useMemo(() => {
    return Object.values(groupedByDate).sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [groupedByDate]);

  // MUI theme colors for lines
  const lineColors = useMemo(
    () => [
      theme.palette.info.main,
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main,
    ],
    [theme]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            color: theme.palette.text.primary,
            font: {
              family: theme.typography.fontFamily as string,
              size: 14,
              weight: theme.typography.fontWeightMedium as any,
            },
            generateLabels: chart => {
              const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
              return original.map((label, index) => ({
                ...label,
                fillStyle: lineColors[index % lineColors.length],
                strokeStyle: lineColors[index % lineColors.length],
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.secondary,
          bodyColor: theme.palette.text.primary,
          borderColor: theme.palette.divider,
          borderWidth: 1,
          callbacks: {
            label: tooltipItem => `${tooltipItem.dataset.label}: ${tooltipItem.formattedValue}`,
          },
        },
        title: {
          display: false,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Date',
            color: theme.palette.text.secondary,
            font: {
              family: theme.typography.fontFamily as string,
              size: 14,
              weight: theme.typography.fontWeightMedium as any,
            } as any,
          },
          ticks: {
            color: theme.palette.text.primary,
            font: {
              family: theme.typography.fontFamily as string,
              size: 12,
            } as any,
          },
          grid: {
            color: theme.palette.divider,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Sales',
            color: theme.palette.text.secondary,
            font: {
              family: theme.typography.fontFamily as string,
              size: 14,
              weight: theme.typography.fontWeightMedium as any,
            } as any,
          },
          ticks: {
            color: theme.palette.text.primary,
            font: {
              family: theme.typography.fontFamily as string,
              size: 12,
            } as any,
            beginAtZero: true,
          },
          grid: {
            color: theme.palette.divider,
          },
          beginAtZero: true,
        },
      },
    }),
    [theme, lineColors]
  );

  const chartDataConfig = useMemo(
    () => ({
      labels: chartData.map((entry: any) => entry.date),
      datasets: menuItems.map((item: string, idx: number) => ({
        label: item,
        data: chartData.map((entry: any) => entry[item] || 0),
        borderColor: lineColors[idx % lineColors.length],
        backgroundColor: 'transparent',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      })),
    }),
    [chartData, menuItems, lineColors]
  );

  // Now do the early return after hooks are called
  if (!data || data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
        No data to display
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflowX: 'auto', // ✅ allow horizontal scroll
        position: 'relative',
      }}
    >
      <Box sx={{ minWidth: chartData.length * 40, height: '100%' }}>
        <Line data={chartDataConfig} options={chartOptions} />
      </Box>
    </Box>
  );
}
