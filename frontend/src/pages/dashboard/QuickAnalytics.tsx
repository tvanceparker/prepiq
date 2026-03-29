import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  People,
  Restaurant,
} from '@mui/icons-material';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarController,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { useQuery } from '@tanstack/react-query';
import { getQuickAnalytics } from '../../api/dashboard';
import type { QuickAnalyticsData } from '../../interfaces/quickAnalytics';

ChartJS.register(
  BarController,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const QuickAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '14d' | '30d'>('7d');

  const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;

  const { data, isLoading } = useQuery<QuickAnalyticsData>({
    queryKey: ['quickAnalytics', days],
    queryFn: () => getQuickAnalytics(days),
  });

  if (isLoading || !data) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const { summary, daily_sales, top_items, bottom_items, hourly_pattern } = data;

  const salesChartData = {
    labels: daily_sales.map(d => d.date),
    datasets: [
      {
        label: 'Sales ($)',
        data: daily_sales.map(d => d.sales),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const ordersChartData = {
    labels: daily_sales.map(d => d.date),
    datasets: [
      {
        label: 'Orders',
        data: daily_sales.map(d => d.orders),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
      },
    ],
  };

  const hourlyChartData = {
    labels: Array.from({ length: hourly_pattern.length }, (_, i) => `${i + 6}:00`),
    datasets: [
      {
        label: 'Orders by Hour',
        data: hourly_pattern,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  const MetricCard = ({
    title,
    value,
    change,
    icon,
    color,
  }: {
    title: string;
    value: string | number;
    change: number;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              mr: 2,
            }}
          >
            {icon}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {change > 0 ? (
            <TrendingUp fontSize="small" color="success" />
          ) : change < 0 ? (
            <TrendingDown fontSize="small" color="error" />
          ) : null}
          <Typography
            variant="caption"
            color={change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'}
            fontWeight="medium"
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}% WoW
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Quick Analytics
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, newValue) => newValue && setTimeRange(newValue)}
          size="small"
        >
          <ToggleButton value="7d">7 Days</ToggleButton>
          <ToggleButton value="14d">14 Days</ToggleButton>
          <ToggleButton value="30d">30 Days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Summary Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Sales"
            value={`$${summary.total_sales.toLocaleString()}`}
            change={summary.wow_sales_change}
            icon={<AttachMoney />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Orders"
            value={summary.total_orders}
            change={summary.wow_orders_change}
            icon={<Receipt />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Order Value"
            value={`$${summary.avg_order_value.toFixed(2)}`}
            change={summary.wow_avg_change}
            icon={<Restaurant />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Customers"
            value={summary.total_customers}
            change={summary.wow_customers_change}
            icon={<People />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Daily Sales Trend
            </Typography>
            <Box sx={{ height: 250 }}>
              <Chart type="line" data={salesChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Daily Orders
            </Typography>
            <Box sx={{ height: 250 }}>
              <Chart type="bar" data={ordersChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Hourly Pattern */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Average Hourly Order Pattern
            </Typography>
            <Box sx={{ height: 200 }}>
              <Chart type="bar" data={hourlyChartData} options={chartOptions} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Top & Bottom Performers */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Top Performers
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="center">Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {top_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.units}</TableCell>
                      <TableCell align="right">${item.revenue.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${item.change > 0 ? '+' : ''}${item.change}%`}
                          size="small"
                          color={
                            item.trend === 'up'
                              ? 'success'
                              : item.trend === 'down'
                                ? 'error'
                                : 'default'
                          }
                          icon={
                            item.trend === 'up' ? (
                              <TrendingUp fontSize="small" />
                            ) : item.trend === 'down' ? (
                              <TrendingDown fontSize="small" />
                            ) : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Needs Attention
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Units</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="center">Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bottom_items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {item.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{item.units}</TableCell>
                      <TableCell align="right">${item.revenue.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${item.change > 0 ? '+' : ''}${item.change}%`}
                          size="small"
                          color={
                            item.trend === 'up'
                              ? 'success'
                              : item.trend === 'down'
                                ? 'error'
                                : 'default'
                          }
                          icon={
                            item.trend === 'up' ? (
                              <TrendingUp fontSize="small" />
                            ) : item.trend === 'down' ? (
                              <TrendingDown fontSize="small" />
                            ) : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuickAnalytics;
