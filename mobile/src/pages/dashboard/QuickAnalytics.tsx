// src/pages/dashboard/QuickAnalytics.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import {
  Text,
  Card,
  Chip,
  useTheme,
  Avatar,
  Divider,
  Surface,
  SegmentedButtons,
  ProgressBar,
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
// import { dashboardApi } from '../../api/dashboard'; // TODO: Add when API endpoint available

interface TopItem {
  name: string;
  sales: number;
  quantity: number;
}

interface HourlyData {
  hour: string;
  sales: number;
  orders: number;
}

const { width: screenWidth } = Dimensions.get('window');

const SimpleBarChart = ({
  data,
  maxValue,
  color,
}: {
  data: HourlyData[];
  maxValue: number;
  color: string;
}) => {
  const theme = useTheme();

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barsContainer}>
        {data.slice(0, 12).map((item, index) => (
          <View key={index} style={styles.barWrapper}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max((item.sales / maxValue) * 100, 5)}%`,
                  backgroundColor: color,
                },
              ]}
            />
            <Text style={[styles.barLabel, { color: theme.colors.onSurfaceVariant }]}>
              {item.hour}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PerformanceItem = ({
  rank,
  name,
  value,
  subtext,
  isTop,
  maxValue,
}: {
  rank: number;
  name: string;
  value: number;
  subtext: string;
  isTop: boolean;
  maxValue: number;
}) => {
  const theme = useTheme();
  const color = isTop ? '#2e7d32' : '#d32f2f';

  return (
    <View style={styles.perfItem}>
      <Avatar.Text
        size={32}
        label={`${rank}`}
        style={{ backgroundColor: `${color}20` }}
        labelStyle={{ color, fontSize: 14, fontWeight: '700' }}
      />
      <View style={styles.perfItemContent}>
        <View style={styles.perfItemHeader}>
          <Text variant="bodyMedium" style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {name}
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: '700', color }}>
            ${value.toLocaleString()}
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {subtext}
        </Text>
        <ProgressBar
          progress={value / maxValue}
          color={color}
          style={{ height: 4, borderRadius: 2, marginTop: 4 }}
        />
      </View>
    </View>
  );
};

export default function QuickAnalytics() {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState('today');

  // Mock data - replace with actual API call when available
  const { data, isLoading } = useQuery({
    queryKey: ['quick-analytics', timeRange],
    queryFn: async () => {
      // In real implementation: return dashboardApi.getQuickAnalytics(timeRange);
      return {
        summary: {
          total_sales: 4285.5,
          total_orders: 142,
          avg_ticket: 30.18,
          sales_change: 8.2,
        },
        top_items: [
          { name: 'Signature Burger', sales: 845, quantity: 56 },
          { name: 'Truffle Fries', sales: 620, quantity: 124 },
          { name: 'Caesar Salad', sales: 485, quantity: 97 },
          { name: 'Grilled Salmon', sales: 440, quantity: 22 },
          { name: 'Chocolate Lava Cake', sales: 320, quantity: 64 },
        ] as TopItem[],
        bottom_items: [
          { name: 'Veggie Wrap', sales: 45, quantity: 9 },
          { name: 'Plain Salad', sales: 60, quantity: 20 },
          { name: 'Soup of the Day', sales: 75, quantity: 25 },
        ] as TopItem[],
        hourly: [
          { hour: '8am', sales: 120, orders: 8 },
          { hour: '9am', sales: 180, orders: 12 },
          { hour: '10am', sales: 240, orders: 16 },
          { hour: '11am', sales: 380, orders: 25 },
          { hour: '12pm', sales: 620, orders: 42 },
          { hour: '1pm', sales: 580, orders: 38 },
          { hour: '2pm', sales: 320, orders: 21 },
          { hour: '3pm', sales: 180, orders: 12 },
          { hour: '4pm', sales: 220, orders: 15 },
          { hour: '5pm', sales: 420, orders: 28 },
          { hour: '6pm', sales: 580, orders: 38 },
          { hour: '7pm', sales: 445, orders: 30 },
        ] as HourlyData[],
        categories: [
          { name: 'Mains', sales: 1850, percentage: 43 },
          { name: 'Appetizers', sales: 920, percentage: 21 },
          { name: 'Desserts', sales: 620, percentage: 14 },
          { name: 'Beverages', sales: 540, percentage: 13 },
          { name: 'Sides', sales: 355, percentage: 9 },
        ],
      };
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  const summary = data?.summary;
  const topItems = data?.top_items || [];
  const bottomItems = data?.bottom_items || [];
  const hourlyData = data?.hourly || [];
  const categories = data?.categories || [];

  const maxSalesHour = Math.max(...hourlyData.map(h => h.sales));
  const maxTopSales = Math.max(...topItems.map(i => i.sales));
  const maxBottomSales = Math.max(...bottomItems.map(i => i.sales));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={{ fontWeight: '700' }}>
            Quick Analytics
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Sales performance insights
          </Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <SegmentedButtons
        value={timeRange}
        onValueChange={setTimeRange}
        buttons={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
        ]}
        style={styles.segmentedButtons}
      />

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard} mode="outlined">
          <Card.Content style={styles.summaryContent}>
            <Avatar.Icon
              size={36}
              icon="currency-usd"
              style={{ backgroundColor: '#e8f5e9' }}
              color="#2e7d32"
            />
            <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8 }}>
              ${summary?.total_sales.toLocaleString()}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Sales
            </Text>
            <Chip
              compact
              icon="trending-up"
              style={{ backgroundColor: '#e8f5e9', marginTop: 4 }}
              textStyle={{ color: '#2e7d32', fontSize: 10 }}
            >
              +{summary?.sales_change}%
            </Chip>
          </Card.Content>
        </Card>

        <Card style={styles.summaryCard} mode="outlined">
          <Card.Content style={styles.summaryContent}>
            <Avatar.Icon
              size={36}
              icon="receipt"
              style={{ backgroundColor: '#e3f2fd' }}
              color="#1976d2"
            />
            <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 8 }}>
              {summary?.total_orders}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Orders
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
              ${summary?.avg_ticket.toFixed(2)} avg
            </Text>
          </Card.Content>
        </Card>
      </View>

      {/* Hourly Sales Chart */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Hourly Sales"
          subtitle="Sales distribution by hour"
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="chart-bar"
              style={{ backgroundColor: `${theme.colors.primary}20` }}
              color={theme.colors.primary}
            />
          )}
        />
        <Card.Content>
          <SimpleBarChart data={hourlyData} maxValue={maxSalesHour} color={theme.colors.primary} />
        </Card.Content>
      </Card>

      {/* Top Performers */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Top Performers"
          subtitle="Best selling items"
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="trophy"
              style={{ backgroundColor: '#fff8e1' }}
              color="#f9a825"
            />
          )}
        />
        <Card.Content>
          {topItems.map((item, index) => (
            <View key={item.name}>
              <PerformanceItem
                rank={index + 1}
                name={item.name}
                value={item.sales}
                subtext={`${item.quantity} sold`}
                isTop={true}
                maxValue={maxTopSales}
              />
              {index < topItems.length - 1 && <Divider style={{ marginVertical: 8 }} />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Needs Attention */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Needs Attention"
          subtitle="Low performing items"
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="alert-circle-outline"
              style={{ backgroundColor: '#ffebee' }}
              color="#d32f2f"
            />
          )}
        />
        <Card.Content>
          {bottomItems.map((item, index) => (
            <View key={item.name}>
              <PerformanceItem
                rank={index + 1}
                name={item.name}
                value={item.sales}
                subtext={`${item.quantity} sold`}
                isTop={false}
                maxValue={maxBottomSales}
              />
              {index < bottomItems.length - 1 && <Divider style={{ marginVertical: 8 }} />}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Category Breakdown */}
      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="Category Breakdown"
          subtitle="Sales by category"
          titleVariant="titleMedium"
          left={props => (
            <Avatar.Icon
              {...props}
              size={40}
              icon="tag-multiple"
              style={{ backgroundColor: '#f3e5f5' }}
              color="#7b1fa2"
            />
          )}
        />
        <Card.Content>
          {categories.map((cat, index) => (
            <View key={cat.name} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                  {cat.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  ${cat.sales.toLocaleString()}
                </Text>
              </View>
              <View style={styles.categoryBar}>
                <ProgressBar
                  progress={cat.percentage / 100}
                  color={theme.colors.secondary}
                  style={{ height: 8, borderRadius: 4, flex: 1 }}
                />
                <Text variant="bodySmall" style={{ marginLeft: 8, fontWeight: '600', width: 36 }}>
                  {cat.percentage}%
                </Text>
              </View>
            </View>
          ))}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  card: {
    marginBottom: 16,
  },
  chartContainer: {
    height: 160,
    paddingTop: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingBottom: 20,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    minHeight: 4,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 9,
    marginTop: 4,
    position: 'absolute',
    bottom: -16,
  },
  perfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  perfItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  perfItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryRow: {
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
