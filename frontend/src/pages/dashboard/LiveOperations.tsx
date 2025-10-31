import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Restaurant,
  AccessTime,
  People,
  LocalShipping,
  Refresh,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { getLiveOperations } from '../../api/dashboard';
import type { LiveOperationsData } from '../../interfaces/liveOperations';

const LiveOperations: React.FC = () => {
  const { data, isLoading, refetch } = useQuery<LiveOperationsData>({
    queryKey: ['liveOperations'],
    queryFn: getLiveOperations,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
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

  const {
    current_shift,
    order_flow,
    todays_pace,
    active_orders,
    kitchen_status,
    upcoming_deliveries,
  } = data;

  // Mock data for now - will be replaced by real data from backend
  const mockActiveOrders =
    active_orders.length > 0
      ? active_orders
      : [
          {
            order_id: 1523,
            table: '12',
            items: 4,
            time_elapsed: 8,
            status: 'in_progress',
            server: 'Alice',
          },
          {
            order_id: 1524,
            table: '5',
            items: 2,
            time_elapsed: 15,
            status: 'ready',
            server: 'Bob',
          },
          {
            order_id: 1525,
            table: 'TO-GO',
            items: 6,
            time_elapsed: 3,
            status: 'pending',
            server: 'Carol',
          },
        ];

  const mockUpcomingDeliveries =
    upcoming_deliveries.length > 0
      ? upcoming_deliveries
      : [
          { supplier: 'Fresh Produce Co', eta: '2:30 PM', items: 'Vegetables, Fruits' },
          { supplier: 'Prime Meats', eta: '3:45 PM', items: 'Beef, Chicken' },
        ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'info';
      case 'ready':
        return 'success';
      default:
        return 'default';
    }
  };

  const getKitchenStatusColor = (status: string) => {
    switch (status) {
      case 'busy':
        return 'error';
      case 'moderate':
        return 'warning';
      case 'idle':
        return 'success';
      default:
        return 'default';
    }
  };

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon,
    color,
    trend,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <Card elevation={0} sx={{ bgcolor: 'background.paper', height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
          {trend && (
            <Box>
              {trend === 'up' ? (
                <TrendingUp color="success" />
              ) : trend === 'down' ? (
                <TrendingDown color="error" />
              ) : null}
            </Box>
          )}
        </Box>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          Live Operations
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {dayjs().format('h:mm A')}
          </Typography>
          <IconButton size="small" onClick={() => refetch()}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {/* Current Status Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Staff Clocked In"
            value={`${current_shift.clocked_in}/${current_shift.scheduled}`}
            subtitle={`${current_shift.on_break} on break`}
            icon={<People />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Active Orders"
            value={order_flow.pending + order_flow.in_progress}
            subtitle={`${order_flow.completed_today} completed today`}
            icon={<Restaurant />}
            color="info"
            trend="neutral"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Avg Prep Time"
            value={`${order_flow.avg_prep_time.toFixed(0)}m`}
            subtitle="Last 10 orders"
            icon={<AccessTime />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Today's Pace"
            value={`${todays_pace.percentage.toFixed(0)}%`}
            subtitle={`$${todays_pace.current_sales.toFixed(2)} / $${todays_pace.forecast_sales.toFixed(2)}`}
            icon={<TrendingUp />}
            color={todays_pace.pace_vs_forecast === 'on_track' ? 'success' : 'warning'}
            trend="up"
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Active Orders Table */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              Active Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order #</TableCell>
                    <TableCell>Table</TableCell>
                    <TableCell align="center">Items</TableCell>
                    <TableCell align="center">Time</TableCell>
                    <TableCell>Server</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockActiveOrders.map(order => (
                    <TableRow key={order.order_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          #{order.order_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={order.table} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">{order.items}</TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color={order.time_elapsed > 15 ? 'error' : 'text.secondary'}
                          fontWeight={order.time_elapsed > 15 ? 'bold' : 'normal'}
                        >
                          {order.time_elapsed}m
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                            {order.server[0]}
                          </Avatar>
                          <Typography variant="body2">{order.server}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={order.status.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(order.status) as any}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Right Column - Kitchen Status & Deliveries */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Kitchen Stations Status */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Kitchen Stations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {Object.entries(kitchen_status).map(([station, status]) => (
                  <Box
                    key={station}
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {station}
                    </Typography>
                    <Chip
                      label={status}
                      size="small"
                      color={getKitchenStatusColor(status) as any}
                      sx={{ minWidth: 80 }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Upcoming Deliveries */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Upcoming Deliveries
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {mockUpcomingDeliveries.map((delivery, index) => (
                  <Box key={index}>
                    <Typography variant="body2" fontWeight="medium">
                      {delivery.supplier}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ETA: {delivery.eta}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {delivery.items}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Today's Progress */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Today's Progress
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Sales vs Forecast</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {todays_pace.percentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={todays_pace.percentage}
                  sx={{ height: 8, borderRadius: 1 }}
                  color={todays_pace.percentage >= 80 ? 'success' : 'warning'}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Current: ${todays_pace.current_sales.toFixed(2)} / Target: $
                {todays_pace.forecast_sales.toFixed(2)}
              </Typography>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LiveOperations;
