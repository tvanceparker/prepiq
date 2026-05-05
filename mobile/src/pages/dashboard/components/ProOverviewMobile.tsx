// src/pages/dashboard/components/ProOverviewMobile.tsx
import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  Chip,
  ProgressBar,
  useTheme,
  Avatar,
  Divider,
  Surface,
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
            size={44}
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
                fontSize: 11,
              }}
            >
              {isPositiveTrend ? '+' : ''}
              {trend}%
            </Chip>
          )}
        </View>
        <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 8 }}>
          {value}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </Card.Content>
    </Card>
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
      {items.map((item, index) => (
        <View key={item.menu_item_id}>
          <View style={styles.topItem}>
            <Avatar.Text
              size={36}
              label={`#${index + 1}`}
              style={{ backgroundColor: `${theme.colors.secondary}20` }}
              labelStyle={{ fontSize: 12, fontWeight: '700', color: theme.colors.secondary }}
            />
            <View style={styles.topItemContent}>
              <Text variant="bodyMedium" style={{ fontWeight: '600' }} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.topItemStats}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Forecasted
                </Text>
                <Text variant="bodySmall" style={{ fontWeight: '600' }}>
                  {item.forecasted_quantity} units
                </Text>
              </View>
              <ProgressBar
                progress={item.forecasted_quantity / maxQuantity}
                color={theme.colors.secondary}
                style={{ height: 5, borderRadius: 3, marginTop: 4 }}
              />
            </View>
          </View>
          {index < items.length - 1 && <Divider style={{ marginVertical: 8 }} />}
        </View>
      ))}
    </View>
  );
};

export default function ProOverviewMobile({ data, navigation }: Props) {
  const theme = useTheme();

  if (!data || Object.keys(data).length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Avatar.Icon
          size={64}
          icon="chart-line"
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
        <Chip icon="chart-timeline-variant" mode="flat" compact>
          Full Tier
        </Chip>
      </View>

      {/* KPI Cards */}
      <View style={styles.metricsRow}>
        <MetricCard
          title="Forecasted Revenue"
          value={`$${forecastedRevenue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          subtitle="Today's projected sales"
          icon="currency-usd"
          color="#2e7d32"
          trend={6.5}
        />
        <MetricCard
          title="Forecasted Orders"
          value={forecastedQuantity.toLocaleString()}
          subtitle="Expected units today"
          icon="food"
          color={theme.colors.primary}
          trend={4.2}
        />
      </View>

      <MetricCard
        title="Forecast Accuracy"
        value={accuracyPercent !== null ? `${accuracyPercent.toFixed(1)}%` : 'N/A'}
        subtitle="Yesterday's performance"
        icon="chart-box"
        color={getAccuracyColor()}
      />

      {/* Top Items */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Top Forecasted Items"
          subtitle="Highest predicted demand"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <TopItemsList items={data.top_5_items_today || []} />
        </Card.Content>
      </Card>

      {/* Forecast Insights */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Forecast Insights"
          subtitle="Full tier analytics"
          titleVariant="titleMedium"
        />
        <Card.Content>
          <Surface style={styles.insightSurface} elevation={0}>
            <View style={styles.insightRow}>
              <Avatar.Icon
                size={36}
                icon="calendar"
                style={{ backgroundColor: `${theme.colors.tertiary}20` }}
                color={theme.colors.tertiary}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  Accuracy Status
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {data.accuracy_yesterday?.note || 'No accuracy data available'}
                </Text>
              </View>
            </View>
          </Surface>

          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8 }}
          >
            Full Features Available
          </Text>
          <View style={styles.chipRow}>
            <Chip compact mode="outlined" style={styles.featureChip}>
              Forecast Analytics
            </Chip>
            <Chip compact mode="outlined" style={styles.featureChip}>
              Weekly Reports
            </Chip>
            <Chip compact mode="outlined" style={styles.featureChip}>
              Ingredient Planning
            </Chip>
          </View>

          <Divider style={{ marginVertical: 16 }} />

          <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center' }}>
            Automated reordering and advanced AI insights are enabled for full-tier restaurants
          </Text>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    marginBottom: 12,
  },
  metricContent: {
    paddingVertical: 12,
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
    paddingVertical: 8,
  },
  topItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  topItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  insightSurface: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#e3f2fd20',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    marginBottom: 4,
  },
});
