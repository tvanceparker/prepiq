// src/pages/team/TeamInsights.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Chip,
  ActivityIndicator,
  List,
  Divider,
  Button,
  SegmentedButtons,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTeamInsightsPage } from './hooks';
import { TeamStatsCard, PerformerCard } from './components';
import type { EmployeePerformance } from '../../interfaces/team';

export default function TeamInsights() {
  const theme = useTheme();

  const {
    // State
    datePreset,
    // Data
    insights,
    stats,
    topPerformers,
    loading,
    // Display
    dateRangeText,
    // Actions
    setLastWeek,
    setLastMonth,
    setThisWeek,
  } = useTeamInsightsPage();

  const summaryStats = [
    {
      label: 'Active Staff',
      value: stats.activeEmployees.toString(),
      icon: 'account-check' as const,
      color: theme.colors.primary,
    },
    {
      label: 'Total Team',
      value: stats.totalEmployees.toString(),
      icon: 'account-group' as const,
      color: theme.colors.secondary,
    },
    {
      label: 'Hours Worked',
      value: `${stats.totalHours}h`,
      icon: 'clock-outline' as const,
      color: '#ff9800',
    },
    {
      label: 'Labor Cost',
      value: `$${stats.totalLaborCost}`,
      icon: 'currency-usd' as const,
      color: '#4caf50',
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        Team Insights
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Labor hours and team performance metrics
      </Text>

      {/* Date Range Selector */}
      <View style={styles.dateSelector}>
        <SegmentedButtons
          value={datePreset}
          onValueChange={value => {
            if (value === 'week') setThisWeek();
            if (value === 'month') setLastMonth();
          }}
          buttons={[
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'Last Month' },
          ]}
        />
        <Text
          variant="bodySmall"
          style={[styles.dateRangeText, { color: theme.colors.onSurfaceVariant }]}
        >
          {dateRangeText}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <>
          {/* Summary Stats */}
          <TeamStatsCard stats={summaryStats} />

          {/* Today's Stats */}
          {insights && (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title="Current Period Summary"
                right={() => <Chip compact>{new Date().toLocaleDateString()}</Chip>}
              />
              <Card.Content>
                <List.Item
                  title="Active Employees"
                  description="Currently active staff"
                  left={() => (
                    <MaterialCommunityIcons
                      name="account-clock"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                      {insights.active_employees ?? 0}
                    </Text>
                  )}
                />
                <Divider />
                <List.Item
                  title="Total Hours Worked"
                  description="Accumulated work time"
                  left={() => (
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={24}
                      color={theme.colors.secondary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>
                      {insights.total_hours_worked?.toFixed(1) ?? 0}h
                    </Text>
                  )}
                />
                <Divider />
                <List.Item
                  title="Avg Hours per Employee"
                  description="Average work time"
                  left={() => (
                    <MaterialCommunityIcons
                      name="chart-line"
                      size={24}
                      color={theme.colors.tertiary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.tertiary }}>
                      {insights.avg_hours_per_employee?.toFixed(1) ?? 0}h
                    </Text>
                  )}
                />
              </Card.Content>
            </Card>
          )}

          {/* Labor Cost Stats */}
          {insights && (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title="Labor & Attendance"
                right={() => (
                  <Chip compact icon="calendar-week">
                    Period Stats
                  </Chip>
                )}
              />
              <Card.Content>
                <List.Item
                  title="Total Labor Cost"
                  description="All employees combined"
                  left={() => (
                    <MaterialCommunityIcons
                      name="currency-usd"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                      ${insights.total_labor_cost?.toFixed(2) ?? '0.00'}
                    </Text>
                  )}
                />
                <Divider />
                <List.Item
                  title="Total Shifts"
                  description="This period"
                  left={() => (
                    <MaterialCommunityIcons
                      name="calendar-check"
                      size={24}
                      color={theme.colors.secondary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.secondary }}>
                      {insights.total_shifts ?? 0}
                    </Text>
                  )}
                />
                <Divider />
                <List.Item
                  title="On-Time Rate"
                  description="Clock-in punctuality"
                  left={() => (
                    <MaterialCommunityIcons
                      name="clock-check"
                      size={24}
                      color={theme.colors.tertiary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.tertiary }}>
                      {((insights.on_time_rate ?? 0) * 100).toFixed(0)}%
                    </Text>
                  )}
                />
              </Card.Content>
            </Card>
          )}

          {/* Top Performers */}
          {topPerformers && topPerformers.length > 0 && (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title="Top Performers"
                right={() => (
                  <Chip compact icon="star">
                    {topPerformers.length}
                  </Chip>
                )}
              />
              <Card.Content>
                {topPerformers.map((performer: EmployeePerformance, index: number) => (
                  <React.Fragment key={performer.employee_id || index}>
                    <PerformerCard performer={performer} />
                    {index < topPerformers.length - 1 && <Divider style={{ marginVertical: 8 }} />}
                  </React.Fragment>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Performance Tips */}
          <Card style={styles.card} mode="outlined">
            <Card.Title title="Quick Tips" titleVariant="titleMedium" />
            <Card.Content>
              <View style={styles.tipRow}>
                <Chip icon="lightbulb-outline" style={styles.tip}>
                  Track overtime to optimize labor costs
                </Chip>
              </View>
              <View style={styles.tipRow}>
                <Chip icon="lightbulb-outline" style={styles.tip}>
                  Review shift coverage during peak hours
                </Chip>
              </View>
              <View style={styles.tipRow}>
                <Chip icon="lightbulb-outline" style={styles.tip}>
                  Ensure breaks are taken per labor laws
                </Chip>
              </View>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 16,
  },
  dateSelector: {
    marginBottom: 16,
  },
  dateRangeText: {
    textAlign: 'center',
    marginTop: 8,
  },
  loader: {
    marginTop: 64,
  },
  card: {
    marginBottom: 16,
  },
  tipRow: {
    marginBottom: 8,
  },
  tip: {
    alignSelf: 'flex-start',
  },
});
