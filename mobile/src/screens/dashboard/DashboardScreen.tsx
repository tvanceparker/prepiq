import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Surface,
  IconButton,
  Chip,
  Avatar,
  useTheme,
  Badge,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuthStore } from '../../stores/authStore';
import { dashboardAPI } from '../../services/api';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

const screenWidth = Dimensions.get('window').width;

interface DashboardData {
  today_sales: number;
  today_target: number;
  alerts_count: number;
  prep_completion: number;
  staff_on_duty: number;
  inventory_alerts: number;
  sales_trend: number[];
  top_items: Array<{ name: string; sales: number; trend: number }>;
  alerts: Array<{ id: string; type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { user, restaurant } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getDailyOverview();
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set mock data for demo
      setData({
        today_sales: 3247.50,
        today_target: 4000.00,
        alerts_count: 3,
        prep_completion: 78,
        staff_on_duty: 8,
        inventory_alerts: 2,
        sales_trend: [2800, 3100, 2950, 3400, 3247],
        top_items: [
          { name: 'Signature Burger', sales: 450, trend: 12 },
          { name: 'Caesar Salad', sales: 320, trend: -5 },
          { name: 'Fish Tacos', sales: 280, trend: 8 },
        ],
        alerts: [
          { id: '1', type: 'inventory', message: 'Tomatoes running low', severity: 'medium' },
          { id: '2', type: 'prep', message: 'Prep behind schedule', severity: 'high' },
          { id: '3', type: 'staff', message: 'Server needed for dinner', severity: 'low' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getSalesPercentage = () => {
    if (!data) return 0;
    return Math.round((data.today_sales / data.today_target) * 100);
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high': return Colors.error;
      case 'medium': return Colors.warning;
      case 'low': return Colors.info;
      default: return Colors.textSecondary;
    }
  };

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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={48} color={Colors.primary} />
          <Text style={{ color: theme.colors.onBackground, marginTop: Spacing.md }}>
            Loading dashboard...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: theme.colors.onBackground }]}>
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.onBackground }]}>
              {user?.username}
            </Text>
            <Text style={[styles.restaurantName, { color: theme.colors.onSurfaceVariant }]}>
              {restaurant?.name}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <IconButton
              icon="bell"
              size={24}
              onPress={() => {}}
              style={styles.notificationIcon}
            />
            {data && data.alerts_count > 0 && (
              <Badge style={styles.notificationBadge} size={18}>
                {data.alerts_count}
              </Badge>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Surface style={[styles.statCard, Shadows.medium]}>
            <MaterialCommunityIcons name="currency-usd" size={32} color={Colors.success} />
            <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
              ${data?.today_sales.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Today's Sales
            </Text>
            <Chip
              icon={getSalesPercentage() >= 100 ? 'trending-up' : 'trending-down'}
              style={[styles.statChip, { 
                backgroundColor: getSalesPercentage() >= 100 ? Colors.success + '20' : Colors.warning + '20' 
              }]}
              textStyle={{ 
                color: getSalesPercentage() >= 100 ? Colors.success : Colors.warning,
                fontSize: 12,
              }}
            >
              {getSalesPercentage()}% of target
            </Chip>
          </Surface>

          <Surface style={[styles.statCard, Shadows.medium]}>
            <MaterialCommunityIcons name="chef-hat" size={32} color={Colors.prep} />
            <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
              {data?.prep_completion}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Prep Complete
            </Text>
            <Chip
              icon="clock"
              style={[styles.statChip, { 
                backgroundColor: (data?.prep_completion || 0) >= 80 ? Colors.success + '20' : Colors.warning + '20'
              }]}
              textStyle={{ 
                color: (data?.prep_completion || 0) >= 80 ? Colors.success : Colors.warning,
                fontSize: 12,
              }}
            >
              On Schedule
            </Chip>
          </Surface>

          <Surface style={[styles.statCard, Shadows.medium]}>
            <MaterialCommunityIcons name="account-group" size={32} color={Colors.team} />
            <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
              {data?.staff_on_duty}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Staff On Duty
            </Text>
            <Chip
              icon="account-check"
              style={[styles.statChip, { backgroundColor: Colors.success + '20' }]}
              textStyle={{ color: Colors.success, fontSize: 12 }}
            >
              Fully Staffed
            </Chip>
          </Surface>

          <Surface style={[styles.statCard, Shadows.medium]}>
            <MaterialCommunityIcons name="package-variant" size={32} color={Colors.inventory} />
            <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
              {data?.inventory_alerts || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Inventory Alerts
            </Text>
            <Chip
              icon="alert"
              style={[styles.statChip, { 
                backgroundColor: (data?.inventory_alerts || 0) > 0 ? Colors.warning + '20' : Colors.success + '20'
              }]}
              textStyle={{ 
                color: (data?.inventory_alerts || 0) > 0 ? Colors.warning : Colors.success,
                fontSize: 12,
              }}
            >
              {(data?.inventory_alerts || 0) > 0 ? 'Needs Attention' : 'All Good'}
            </Chip>
          </Surface>
        </View>

        {/* Sales Trend Chart */}
        <Card style={[styles.chartCard, Shadows.medium]}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Sales Trend (Last 5 Days)
              </Text>
              <IconButton icon="chart-line" size={20} />
            </View>
            
            {data?.sales_trend && (
              <LineChart
                data={{
                  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Today'],
                  datasets: [{
                    data: data.sales_trend,
                    strokeWidth: 3,
                  }],
                }}
                width={screenWidth - (Spacing.lg * 4)}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            )}
          </Card.Content>
        </Card>

        {/* Top Performing Items */}
        <Card style={[styles.card, Shadows.medium]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Top Performing Items
              </Text>
              <Button mode="text" compact onPress={() => {}}>
                View All
              </Button>
            </View>
            
            {data?.top_items.map((item, index) => (
              <View key={index} style={styles.topItem}>
                <View style={styles.topItemLeft}>
                  <Avatar.Icon
                    size={40}
                    icon="silverware-fork-knife"
                    style={{ backgroundColor: Colors.primary + '20' }}
                  />
                  <View style={styles.topItemInfo}>
                    <Text style={[styles.topItemName, { color: theme.colors.onSurface }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.topItemSales, { color: theme.colors.onSurfaceVariant }]}>
                      ${item.sales} sold today
                    </Text>
                  </View>
                </View>
                <Chip
                  icon={item.trend > 0 ? 'trending-up' : 'trending-down'}
                  style={[styles.trendChip, { 
                    backgroundColor: item.trend > 0 ? Colors.success + '20' : Colors.error + '20' 
                  }]}
                  textStyle={{ 
                    color: item.trend > 0 ? Colors.success : Colors.error,
                    fontSize: 12,
                  }}
                >
                  {item.trend > 0 ? '+' : ''}{item.trend}%
                </Chip>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Active Alerts */}
        <Card style={[styles.card, Shadows.medium]}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Active Alerts
              </Text>
              <Chip
                style={{ backgroundColor: Colors.error + '20' }}
                textStyle={{ color: Colors.error, fontSize: 12 }}
              >
                {data?.alerts.length} Active
              </Chip>
            </View>
            
            {data?.alerts.map((alert) => (
              <Surface key={alert.id} style={styles.alertItem}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color={getAlertColor(alert.severity)}
                />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertMessage, { color: theme.colors.onSurface }]}>
                    {alert.message}
                  </Text>
                  <Chip
                    style={[styles.alertSeverity, { 
                      backgroundColor: getAlertColor(alert.severity) + '20' 
                    }]}
                    textStyle={{ 
                      color: getAlertColor(alert.severity), 
                      fontSize: 10,
                    }}
                  >
                    {alert.severity.toUpperCase()}
                  </Chip>
                </View>
                <IconButton
                  icon="chevron-right"
                  size={20}
                  onPress={() => {}}
                />
              </Surface>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    position: 'relative',
  },
  greeting: {
    ...Typography.body1,
    opacity: 0.8,
  },
  userName: {
    ...Typography.h3,
    fontWeight: 'bold',
    marginTop: Spacing.xs,
  },
  restaurantName: {
    ...Typography.body2,
    marginTop: Spacing.xs,
  },
  notificationIcon: {
    margin: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.error,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minHeight: 120,
  },
  statValue: {
    ...Typography.h3,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  statLabel: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  statChip: {
    marginTop: Spacing.sm,
  },
  chartCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.h4,
    fontWeight: '600',
  },
  chart: {
    borderRadius: BorderRadius.sm,
  },
  topItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  topItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topItemInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  topItemName: {
    ...Typography.body1,
    fontWeight: '500',
  },
  topItemSales: {
    ...Typography.body2,
    marginTop: Spacing.xs,
  },
  trendChip: {
    marginLeft: Spacing.sm,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  alertContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  alertMessage: {
    ...Typography.body1,
    marginBottom: Spacing.xs,
  },
  alertSeverity: {
    alignSelf: 'flex-start',
  },
});