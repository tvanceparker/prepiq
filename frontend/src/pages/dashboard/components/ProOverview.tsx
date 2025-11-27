// src/pages/dashboard/components/ProOverview.tsx
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Divider,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Restaurant as RestaurantIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import type { DailyOverviewDTO } from '../../../interfaces/dashboardInterfaceFrontend';

interface ProOverviewProps {
  data: DailyOverviewDTO | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
}) => {
  const theme = useTheme();
  const isPositiveTrend = trend && trend >= 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[2],
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              width: 44,
              height: 44,
            }}
          >
            {icon}
          </Avatar>
          {trend !== undefined && (
            <Chip
              size="small"
              icon={isPositiveTrend ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
              label={`${isPositiveTrend ? '+' : ''}${trend}%`}
              sx={{
                bgcolor: isPositiveTrend
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                color: isPositiveTrend
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                fontWeight: 600,
                height: 24,
                '& .MuiChip-icon': { color: 'inherit' },
              }}
            />
          )}
        </Box>
        <Typography variant="h5" fontWeight={700} color="text.primary" gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

interface TopItem {
  menu_item_id: number;
  name: string;
  forecasted_quantity: number;
}

const TopItemsList: React.FC<{ items: TopItem[] }> = ({ items }) => {
  const theme = useTheme();

  if (!items || items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        No forecasted items available
      </Typography>
    );
  }

  const maxQuantity = Math.max(...items.map(i => i.forecasted_quantity));

  return (
    <List disablePadding>
      {items.map((item, index) => (
        <ListItem
          key={item.menu_item_id}
          sx={{
            px: 0,
            py: 1.5,
            borderBottom: index < items.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
          }}
        >
          <ListItemAvatar>
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.secondary.main, 0.1),
                color: theme.palette.secondary.main,
                fontWeight: 700,
                fontSize: '0.875rem',
                width: 36,
                height: 36,
              }}
            >
              #{index + 1}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight={600} noWrap>
                {item.name}
              </Typography>
            }
            secondary={
              <Box sx={{ mt: 0.75 }}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Forecasted
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {item.forecasted_quantity} units
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(item.forecasted_quantity / maxQuantity) * 100}
                  sx={{
                    height: 5,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.secondary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 2,
                      bgcolor: theme.palette.secondary.main,
                    },
                  }}
                />
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};

export default function ProOverview({ data }: ProOverviewProps) {
  const theme = useTheme();

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
        flexDirection="column"
        gap={2}
      >
        <AnalyticsIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          No data available
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Upload sales data to generate forecasts
        </Typography>
      </Box>
    );
  }

  const forecastedRevenue = data.forecasted_sales_today?.forecasted_revenue ?? 0;
  const forecastedQuantity = data.forecasted_sales_today?.forecasted_quantity ?? 0;
  const accuracyPercent = data.accuracy_yesterday?.accuracy_percent ?? null;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Pro Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Chip
            icon={<TimelineIcon />}
            label="Pro Tier"
            color="secondary"
            variant="filled"
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Tooltip title="Refresh">
            <IconButton size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Forecasted Revenue"
            value={`$${forecastedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Today's projected sales"
            icon={<MoneyIcon />}
            color={theme.palette.success.main}
            trend={6.5}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Forecasted Orders"
            value={forecastedQuantity.toLocaleString()}
            subtitle="Expected units today"
            icon={<RestaurantIcon />}
            color={theme.palette.primary.main}
            trend={4.2}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Forecast Accuracy"
            value={accuracyPercent !== null ? `${accuracyPercent.toFixed(1)}%` : 'N/A'}
            subtitle="Yesterday's performance"
            icon={<AssessmentIcon />}
            color={
              accuracyPercent !== null
                ? accuracyPercent >= 90
                  ? theme.palette.success.main
                  : accuracyPercent >= 75
                    ? theme.palette.warning.main
                    : theme.palette.error.main
                : theme.palette.grey[500]
            }
          />
        </Grid>
      </Grid>

      {/* Content Grid */}
      <Grid container spacing={2.5}>
        {/* Top Items */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <CardHeader
              title={
                <Typography variant="subtitle1" fontWeight={600}>
                  Top Forecasted Items
                </Typography>
              }
              subheader="Highest predicted demand"
              sx={{ pb: 0 }}
            />
            <CardContent>
              <TopItemsList items={data.top_5_items_today || []} />
            </CardContent>
          </Card>
        </Grid>

        {/* Forecast Status */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
            }}
          >
            <CardHeader
              title={
                <Typography variant="subtitle1" fontWeight={600}>
                  Forecast Insights
                </Typography>
              }
              subheader="Pro tier analytics"
              sx={{ pb: 0 }}
            />
            <CardContent>
              <Stack spacing={2}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: alpha(theme.palette.info.main, 0.04),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    borderRadius: 2,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: theme.palette.info.main,
                        width: 36,
                        height: 36,
                      }}
                    >
                      <CalendarIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        Accuracy Status
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.accuracy_yesterday?.note || 'No accuracy data available'}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Pro Features Available
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                      label="Forecast Analytics"
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                    <Chip
                      label="Weekly Reports"
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                    <Chip
                      label="Ingredient Planning"
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  </Box>
                </Box>

                <Divider />

                <Typography variant="caption" color="text.disabled" textAlign="center">
                  Upgrade to Master tier for automated reordering and advanced AI insights
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
