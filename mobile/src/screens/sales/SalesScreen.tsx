import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Card, Chip, Surface, FAB, IconButton, useTheme } from 'react-native-paper';
import { LineChart, BarChart } from 'react-native-chart-kit';
import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

const screenWidth = Dimensions.get('window').width;

export default function SalesScreen() {
  const theme = useTheme();
  const [timeframe, setTimeframe] = useState('week');

  const salesData = {
    week: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: [2800, 3100, 2950, 3400, 3247, 4200, 3800],
        strokeWidth: 3,
      }],
    },
    month: {
      labels: ['W1', 'W2', 'W3', 'W4'],
      datasets: [{
        data: [22000, 25000, 23500, 26800],
        strokeWidth: 3,
      }],
    },
  };

  const topItems = [
    { name: 'Signature Burger', sales: 450, percentage: 15.2 },
    { name: 'Caesar Salad', sales: 320, percentage: 10.8 },
    { name: 'Fish Tacos', sales: 280, percentage: 9.4 },
    { name: 'Ribeye Steak', sales: 250, percentage: 8.4 },
  ];

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: BorderRadius.md,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: Colors.primary,
    },
  };

  return (
    <ScreenLayout
      title="Sales Analytics"
      subtitle="Track your sales performance and trends"
      icon="chart-line"
      iconColor={Colors.sales}
      rightAction={
        <IconButton
          icon="refresh"
          size={24}
          onPress={() => {}}
        />
      }
    >
      {/* Time Frame Selector */}
      <View style={styles.timeframeContainer}>
        <Chip
          selected={timeframe === 'week'}
          onPress={() => setTimeframe('week')}
          style={[styles.timeframeChip, timeframe === 'week' && styles.selectedChip]}
        >
          This Week
        </Chip>
        <Chip
          selected={timeframe === 'month'}
          onPress={() => setTimeframe('month')}
          style={[styles.timeframeChip, timeframe === 'month' && styles.selectedChip]}
        >
          This Month
        </Chip>
      </View>

      {/* Sales Chart */}
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Sales Trend
          </Text>
          <LineChart
            data={salesData[timeframe as keyof typeof salesData]}
            width={screenWidth - (Spacing.lg * 4)}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Surface style={[styles.statCard, Shadows.small]}>
          <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
            $3,247
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
            Today's Sales
          </Text>
        </Surface>
        <Surface style={[styles.statCard, Shadows.small]}>
          <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
            81%
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
            Target Progress
          </Text>
        </Surface>
      </View>

      {/* Top Selling Items */}
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            Top Selling Items
          </Text>
          {topItems.map((item, index) => (
            <View key={index} style={styles.topItem}>
              <View style={styles.topItemInfo}>
                <Text style={[styles.topItemName, { color: theme.colors.onSurface }]}>
                  {item.name}
                </Text>
                <Text style={[styles.topItemSales, { color: theme.colors.onSurfaceVariant }]}>
                  {item.sales} orders • {item.percentage}% of total
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${item.percentage * 5}%`, backgroundColor: Colors.primary }
                  ]} 
                />
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
        label="New Sale"
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  timeframeContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  timeframeChip: {
    flex: 1,
  },
  selectedChip: {
    backgroundColor: Colors.primary + '20',
  },
  card: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  cardTitle: {
    ...Typography.h4,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  chart: {
    borderRadius: BorderRadius.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h3,
    fontWeight: 'bold',
  },
  statLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  topItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  topItemInfo: {
    marginBottom: Spacing.sm,
  },
  topItemName: {
    ...Typography.body1,
    fontWeight: '500',
  },
  topItemSales: {
    ...Typography.body2,
    marginTop: Spacing.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#00000010',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.sales,
  },
});