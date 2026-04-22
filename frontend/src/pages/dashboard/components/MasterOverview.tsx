// src/pages/dashboard/components/MasterOverview.tsx
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
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
  Star as StarIcon,
  Schedule as ScheduleIcon,
  AutoMode as AutoModeIcon,
} from '@mui/icons-material';
import type { DailyOverviewDTO } from '../../../interfaces/dashboardInterfaceFrontend';

interface MasterOverviewProps {
  data: DailyOverviewDTO | null;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  trendLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendLabel,
}) => {
  const theme = useTheme();
  const isPositiveTrend = trend && trend >= 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: theme.shadows[4],
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Avatar
            sx={{
              bgcolor: alpha(color, 0.1),
              color: color,
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
          {trend !== undefined && (
            <Chip
              size="small"
              icon={isPositiveTrend ? <TrendingUpIcon /> : <TrendingDownIcon />}
              label={`${isPositiveTrend ? '+' : ''}${trend}%`}
              sx={{
                bgcolor: isPositiveTrend
                  ? alpha(theme.palette.success.main, 0.1)
                  : alpha(theme.palette.error.main, 0.1),
                color: isPositiveTrend
                  ? theme.palette.success.main
                  : theme.palette.error.main,
                fontWeight: 600,
              }}
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight={700} color="text.primary" gutterBottom>
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
        {trendLabel && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {trendLabel}
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
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              #{index + 1}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="body1" fontWeight={600} noWrap>
                {item.name}
              </Typography>
            }
            secondary={
              <Box sx={{ mt: 1 }}>
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
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      bgcolor: theme.palette.primary.main,
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

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  badge?: string;
}

const QuickActionCard: React.FC<QuickActionProps> = ({
  icon,
  title,
  description,
  color,
  badge,
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: color,
          bgcolor: alpha(color, 0.02),
        },
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          sx={{
            bgcolor: alpha(color, 0.1),
            color: color,
            width: 40,
            height: 40,
          }}
        >
          {icon}
        </Avatar>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" fontWeight={600}>
              {title}
            </Typography>
            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha(color, 0.1),
                  color: color,
                }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <ArrowIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
      </Box>
    </Paper>
  );
};

export default function MasterOverview({ data }: MasterOverviewProps) {
  const theme = useTheme();

  if (!data || Object.keys(data).length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
        flexDirection="column"
        gap={2}
      >
        <AnalyticsIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h6" color="text.secondary">
          No data available for dashboard
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Check back later or upload sales data to generate forecasts
        </Typography>
      </Box>
    );
  }

  const forecastedRevenue = data.forecasted_sales_today?.forecasted_revenue ?? 0;
  const forecastedQuantity = data.forecasted_sales_today?.forecasted_quantity ?? 0;
  const accuracyPercent = data.accuracy_yesterday?.accuracy_percent ?? null;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary">
            Master Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Chip
            icon={<StarIcon />}
            label="Full Tier"
            color="primary"
            variant="filled"
            sx={{ fontWeight: 600 }}
          />
          <Tooltip title="Refresh data">
            <IconButton>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Forecasted Revenue"
            value={`$${forecastedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle="Today's projected sales"
            icon={<MoneyIcon />}
            color={theme.palette.success.main}
            trend={8.2}
            trendLabel="vs last week"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Forecasted Orders"
            value={forecastedQuantity.toLocaleString()}
            subtitle="Expected units today"
            icon={<RestaurantIcon />}
            color={theme.palette.primary.main}
            trend={5.4}
            trendLabel="vs last week"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Forecast Accuracy"
            value={accuracyPercent !== null ? `${accuracyPercent.toFixed(1)}%` : 'N/A'}
            subtitle="Yesterday's performance"
            icon={<AnalyticsIcon />}
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
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Auto-Reorders"
            value="3"
            subtitle="Pending suggestions"
            icon={<AutoModeIcon />}
            color={theme.palette.info.main}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={600}>
                  Top Forecasted Items
                </Typography>
              }
              subheader="Highest predicted demand today"
              action={
                <Chip
                  label="Live"
                  size="small"
                  color="success"
                  sx={{ fontWeight: 600 }}
                />
              }
            />
            <Divider />
            <CardContent>
              <TopItemsList items={data.top_5_items_today || []} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            elevation={0}
            sx={{
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}
          >
            <CardHeader
              title={
                <Typography variant="h6" fontWeight={600}>
                  Quick Actions
                </Typography>
              }
              subheader="Full tier features at your fingertips"
            />
            <Divider />
            <CardContent>
              <Stack spacing={2}>
                <QuickActionCard
                  icon={<AutoModeIcon />}
                  title="Automated Reordering"
                  description="Review and approve suggested reorders"
                  color={theme.palette.primary.main}
                  badge="3 pending"
                />
                <QuickActionCard
                  icon={<AnalyticsIcon />}
                  title="Advanced Analytics"
                  description="Deep dive into sales patterns and trends"
                  color={theme.palette.info.main}
                  badge="New"
                />
                <QuickActionCard
                  icon={<InventoryIcon />}
                  title="Inventory Optimization"
                  description="AI-powered stock level recommendations"
                  color={theme.palette.success.main}
                />
                <QuickActionCard
                  icon={<ScheduleIcon />}
                  title="Prep Scheduling"
                  description="Optimize prep based on forecasts"
                  color={theme.palette.warning.main}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {accuracyPercent !== null && accuracyPercent >= 85 ? (
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.success.main, 0.1),
                          color: theme.palette.success.main,
                          width: 56,
                          height: 56,
                        }}
                      >
                        <CheckIcon fontSize="large" />
                      </Avatar>
                    ) : (
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.main,
                          width: 56,
                          height: 56,
                        }}
                      >
                        <WarningIcon fontSize="large" />
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Forecast Status
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.accuracy_yesterday?.note || 'No accuracy data available'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={8}>
                  <Box
                    display="flex"
                    gap={2}
                    flexWrap="wrap"
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                  >
                    <Chip
                      icon={<CheckIcon />}
                      label="EOD Complete"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      icon={<ShippingIcon />}
                      label="2 Deliveries Expected"
                      color="info"
                      variant="outlined"
                    />
                    <Chip
                      icon={<InventoryIcon />}
                      label="Stock Levels OK"
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
