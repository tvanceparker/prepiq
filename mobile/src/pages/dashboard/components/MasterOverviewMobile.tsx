// src/pages/dashboard/components/MasterOverviewMobile.tsx
import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ProgressBar,
  useTheme,
  Avatar,
  Divider,
  Surface,
  IconButton,
} from 'react-native-paper';

interface Props {
  data: any;
  navigation?: any;
}

interface TopItem {
  menu_item_id: number;
  name: string;
  forecasted_quantity: number;
}

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
  icon: string;
  color: string;
  trend?: number;
}) => {
  const theme = useTheme();
  const isPositiveTrend = trend && trend >= 0;

  return (
    <Card style={styles.metricCard} mode="outlined">
      <Card.Content style={styles.metricContent}>
        <View style={styles.metricHeader}>
          <Avatar.Icon
            size={40}
            icon={icon}
            style={{ backgroundColor: `${color}20` }}
            color={color}
          />
          {trend !== undefined && (
            <Chip
              compact
              icon={isPositiveTrend ? 'trending-up' : 'trending-down'}
              style={{
                backgroundColor: isPositiveTrend ? '#e8f5e9' : '#ffebee',
              }}
              textStyle={{
                color: isPositiveTrend ? '#2e7d32' : '#c62828',
                fontSize: 10,
              }}
            >
              {isPositiveTrend ? '+' : ''}
              {trend}%
            </Chip>
          )}
        </View>
        <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 6 }}>
          {value}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {title}
        </Text>
        {subtitle && (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.outline, fontSize: 10, marginTop: 2 }}
          >
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const QuickActionCard = ({
  title,
  description,
  icon,
  color,
  onPress,
  status,
}: {
  title: string;
  description: string;
  icon: string;
  color: string;
  onPress?: () => void;
  status?: 'active' | 'inactive' | 'pending';
}) => {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#2e7d32';
      case 'pending':
        return '#ed6c02';
      case 'inactive':
      default:
        return theme.colors.outline;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.quickActionSurface} elevation={0}>
        <View style={styles.quickActionRow}>
          <Avatar.Icon
            size={44}
            icon={icon}
            style={{ backgroundColor: `${color}20` }}
            color={color}
          />
          <View style={styles.quickActionContent}>
            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
              {title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {description}
            </Text>
          </View>
          {status && (
            <Chip
              compact
              style={{ backgroundColor: `${getStatusColor()}15` }}
              textStyle={{ color: getStatusColor(), fontSize: 10 }}
            >
              {status}
            </Chip>
          )}
          <IconButton icon="chevron-right" size={20} />
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const TopItemsList = ({ items }: { items: TopItem[] }) => {
  const theme = useTheme();

  if (!items || items.length === 0) {
    return (
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 16 }}
      >
        No forecasted items available
      </Text>
    );
  }

  const maxQuantity = Math.max(...items.map(i => i.forecasted_quantity));

  return (
    <View>
      {items.slice(0, 5).map((item, index) => (
        <View key={item.menu_item_id}>
          <View style={styles.topItem}>
            <Avatar.Text
              size={32}
              label={`${index + 1}`}
              style={{ backgroundColor: `${theme.colors.primary}15` }}
              labelStyle={{ fontSize: 12, fontWeight: '700', color: theme.colors.primary }}
            />
            <View style={styles.topItemContent}>
              <Text variant="bodyMedium" style={{ fontWeight: '500' }} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.topItemStats}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Forecast
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {item.forecasted_quantity}
                </Text>
              </View>
              <ProgressBar
                progress={item.forecasted_quantity / maxQuantity}
                color={theme.colors.primary}
                style={{ height: 4, borderRadius: 2, marginTop: 4 }}
              />
            </View>
          </View>
          {index < Math.min(items.length, 5) - 1 && <Divider style={{ marginVertical: 6 }} />}
        </View>
      ))}
    </View>
  );
};

export default function MasterOverviewMobile({ data, navigation }: Props) {
  const theme = useTheme();

  if (!data || Object.keys(data).length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Avatar.Icon
          size={64}
          icon="chart-areaspline"
          style={{ backgroundColor: theme.colors.surfaceVariant }}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
          No data available
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
          Upload sales data to generate forecasts
        </Text>
      </View>
    );
  }

  const forecastedRevenue = data.forecasted_sales_today?.forecasted_revenue ?? 0;
  const forecastedQuantity = data.forecasted_sales_today?.forecasted_quantity ?? 0;
  const accuracyPercent = data.accuracy_yesterday?.accuracy_percent ?? null;
  const lowStockAlerts = data.low_stock_alerts ?? [];
  const pendingReorders = data.pending_reorders ?? [];

  const getAccuracyColor = () => {
    if (accuracyPercent === null) return theme.colors.outline;
    if (accuracyPercent >= 90) return '#2e7d32';
    if (accuracyPercent >= 75) return '#ed6c02';
    return '#d32f2f';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>
            Full Dashboard
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <Chip
          icon="crown"
          mode="flat"
          compact
          style={{ backgroundColor: '#FFD70030' }}
          textStyle={{ color: '#B8860B' }}
        >
          Full Tier
        </Chip>
      </View>

      {/* KPI Cards - 2x2 Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard
          title="Revenue Forecast"
          value={`$${forecastedRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
          subtitle="Today's projection"
          icon="currency-usd"
          color="#2e7d32"
          trend={8.2}
        />
        <MetricCard
          title="Order Forecast"
          value={forecastedQuantity.toLocaleString()}
          subtitle="Expected units"
          icon="food"
          color={theme.colors.primary}
          trend={5.1}
        />
        <MetricCard
          title="Accuracy"
          value={accuracyPercent !== null ? `${accuracyPercent.toFixed(0)}%` : 'N/A'}
          subtitle="Yesterday"
          icon="chart-box"
          color={getAccuracyColor()}
        />
        <MetricCard
          title="Low Stock"
          value={lowStockAlerts.length}
          subtitle="Items to reorder"
          icon="alert-circle"
          color={lowStockAlerts.length > 0 ? '#d32f2f' : '#2e7d32'}
        />
      </View>

      {/* Top Items */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Top Forecasted Items"
          subtitle="Highest predicted demand today"
          titleVariant="titleMedium"
          right={props => (
            <IconButton
              {...props}
              icon="chevron-right"
              onPress={() => navigation?.navigate('analytics')}
            />
          )}
        />
        <Card.Content>
          <TopItemsList items={data.top_5_items_today || []} />
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Quick Actions"
          subtitle="Full tier automation"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <QuickActionCard
            title="Auto-Reordering"
            description="Intelligent inventory replenishment"
            icon="sync"
            color="#2196f3"
            status={pendingReorders.length > 0 ? 'pending' : 'active'}
            onPress={() => navigation?.navigate('inventory')}
          />
          <Divider style={{ marginVertical: 8 }} />
          <QuickActionCard
            title="Advanced Analytics"
            description="ML-powered insights & trends"
            icon="chart-line"
            color="#9c27b0"
            status="active"
            onPress={() => navigation?.navigate('analytics')}
          />
          <Divider style={{ marginVertical: 8 }} />
          <QuickActionCard
            title="Optimization Engine"
            description="Menu & pricing recommendations"
            icon="cog-outline"
            color="#ff9800"
            status="active"
            onPress={() => navigation?.navigate('menu')}
          />
          <Divider style={{ marginVertical: 8 }} />
          <QuickActionCard
            title="Prep Scheduling"
            description="AI-assisted prep planning"
            icon="calendar-clock"
            color="#4caf50"
            status="active"
            onPress={() => navigation?.navigate('prep')}
          />
        </Card.Content>
      </Card>

      {/* Forecast Status */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Forecast Status"
          subtitle="AI engine performance"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <Surface style={styles.statusSurface} elevation={0}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Avatar.Icon
                  size={36}
                  icon="check-circle"
                  style={{ backgroundColor: '#e8f5e9' }}
                  color="#2e7d32"
                />
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  Model Active
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Avatar.Icon
                  size={36}
                  icon="cloud-check"
                  style={{ backgroundColor: '#e3f2fd' }}
                  color="#1976d2"
                />
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  Data Synced
                </Text>
              </View>
              <View style={styles.statusItem}>
                <Avatar.Icon
                  size={36}
                  icon="weather-sunny"
                  style={{ backgroundColor: '#fff3e0' }}
                  color="#e65100"
                />
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  Weather OK
                </Text>
              </View>
            </View>
          </Surface>

          <View style={styles.accuracyNote}>
            <Avatar.Icon
              size={32}
              icon="information"
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginLeft: 12, flex: 1 }}
            >
              {data.accuracy_yesterday?.note || 'Forecasting engine is calibrated and ready'}
            </Text>
          </View>

          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 16 }}>
            Master Features
          </Text>
          <View style={styles.chipRow}>
            <Chip compact mode="outlined" icon="brain" style={styles.featureChip}>
              AI Forecasting
            </Chip>
            <Chip compact mode="outlined" icon="sync" style={styles.featureChip}>
              Auto-Reorder
            </Chip>
            <Chip compact mode="outlined" icon="chart-timeline" style={styles.featureChip}>
              Deep Analytics
            </Chip>
            <Chip compact mode="outlined" icon="account-multiple" style={styles.featureChip}>
              Team Scheduling
            </Chip>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  metricCard: {
    width: '48.5%',
    marginBottom: 4,
  },
  metricContent: {
    paddingVertical: 10,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  card: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  topItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  topItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  quickActionSurface: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionContent: {
    flex: 1,
    marginLeft: 12,
  },
  statusSurface: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  accuracyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  featureChip: {
    marginBottom: 4,
  },
});
