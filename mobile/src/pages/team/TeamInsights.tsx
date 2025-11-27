// src/pages/team/TeamInsights.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Chip, ActivityIndicator, List, Divider } from 'react-native-paper';
import { useEmployees, useTeamInsights } from '../../hooks/useTeam';
import { Employee } from '../../interfaces/team';

export default function TeamInsights() {
  const theme = useTheme();

  // Get current week date range
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const { employees, loading: isLoadingEmployees } = useEmployees();
  const { insights, loading: isLoadingInsights } = useTeamInsights({
    start_date: startOfWeek.toISOString().split('T')[0],
    end_date: endOfWeek.toISOString().split('T')[0],
  });

  const loading = isLoadingInsights || isLoadingEmployees;

  // Calculate some derived stats
  const activeEmployees = (employees || []).filter((e: Employee) => e.is_active).length;
  const totalEmployees = (employees || []).length;

  const formatHours = (mins?: number) => {
    if (!mins) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

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

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <>
          {/* Summary Stats */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard} mode="outlined">
              <Card.Content style={styles.statContent}>
                <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                  {activeEmployees}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Active Staff
                </Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard} mode="outlined">
              <Card.Content style={styles.statContent}>
                <Text variant="displaySmall" style={{ color: theme.colors.secondary }}>
                  {totalEmployees}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Total Team
                </Text>
              </Card.Content>
            </Card>
          </View>

          {/* Today's Stats */}
          {insights && (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title="Today's Summary"
                right={() => <Chip compact>{new Date().toLocaleDateString()}</Chip>}
              />
              <Card.Content>
                <List.Item
                  title="Active Employees"
                  description="Currently active staff"
                  left={props => <List.Icon {...props} icon="account-clock" />}
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
                  left={props => <List.Icon {...props} icon="clock-outline" />}
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
                  left={props => <List.Icon {...props} icon="chart-line" />}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.tertiary }}>
                      {insights.avg_hours_per_employee?.toFixed(1) ?? 0}h
                    </Text>
                  )}
                />
              </Card.Content>
            </Card>
          )}

          {/* Weekly Stats */}
          {insights && (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title="This Week"
                right={() => (
                  <Chip compact icon="calendar-week">
                    Week Stats
                  </Chip>
                )}
              />
              <Card.Content>
                <List.Item
                  title="Total Labor Cost"
                  description="All employees combined"
                  left={props => <List.Icon {...props} icon="currency-usd" />}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                      ${insights.total_labor_cost?.toFixed(2) ?? '0.00'}
                    </Text>
                  )}
                />
                <Divider />
                <List.Item
                  title="Total Shifts"
                  description="This week"
                  left={props => <List.Icon {...props} icon="calendar-check" />}
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
                  left={props => <List.Icon {...props} icon="clock-check" />}
                  right={() => (
                    <Text variant="titleMedium" style={{ color: theme.colors.tertiary }}>
                      {(insights.on_time_rate * 100)?.toFixed(0) ?? 0}%
                    </Text>
                  )}
                />
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
    marginBottom: 24,
  },
  loader: {
    marginTop: 64,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 8,
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
