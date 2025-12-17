import React from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { useWasteDashboard } from './hooks/useWasteDashboard';

export default function InsightsOptimization() {
  const theme = useTheme();
  const { startDate, endDate, setStartDate, setEndDate, query, insights, setQuickRange } =
    useWasteDashboard();

  const loading = query.isLoading || query.isFetching;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.background }}>
      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            Optimization
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 4 }}>
            Insights
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {startDate} → {endDate}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[14, 30, 60].map(days => (
              <Chip key={days} mode="outlined" onPress={() => setQuickRange(days)}>
                Last {days}d
              </Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TextInput
              mode="outlined"
              label="Start"
              value={startDate}
              onChangeText={setStartDate}
              style={{ flex: 1 }}
            />
            <TextInput
              mode="outlined"
              label="End"
              value={endDate}
              onChangeText={setEndDate}
              style={{ flex: 1 }}
            />
          </View>
        </Card.Content>
      </Card>

      {loading && (
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <ActivityIndicator />
        </View>
      )}

      {!loading && insights.length === 0 && (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          No insights yet for this window.
        </Text>
      )}

      {insights.map((insight, idx) => (
        <Card key={idx} style={{ marginBottom: 10 }}>
          <Card.Content>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              {insight.title}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {insight.detail}
            </Text>
            {insight.action && (
              <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                {insight.action}
              </Text>
            )}
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}
