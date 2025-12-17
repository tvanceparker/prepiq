import React from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Card, Chip, ProgressBar, Text, TextInput, useTheme } from 'react-native-paper';
import { useWasteDashboard } from './hooks/useWasteDashboard';

const currency = (value: number) => `$${(value ?? 0).toFixed(2)}`;

export default function WasteDashboard() {
  const theme = useTheme();
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    typeFilter,
    setTypeFilter,
    query,
    data,
    insights,
    filteredTrend,
    setQuickRange,
  } = useWasteDashboard();

  const loading = query.isLoading || query.isFetching;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.background }}>
      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            Waste Analytics
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 4 }}>
            Waste Dashboard
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {startDate} → {endDate}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[30, 60, 90].map(days => (
              <Chip key={days} mode="outlined" onPress={() => setQuickRange(days)}>
                Last {days}d
              </Chip>
            ))}
            {(data?.by_type || []).map(t => (
              <Chip
                key={t.key}
                mode={typeFilter === t.usage_type ? 'flat' : 'outlined'}
                selected={typeFilter === t.usage_type}
                onPress={() => setTypeFilter(t.usage_type || 'all')}
              >
                {t.label}
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

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Card style={{ flex: 1 }}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              Waste cost
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
              {currency(data?.total_waste_cost ?? 0)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Avg daily {currency(data?.average_daily_cost ?? 0)}
            </Text>
          </Card.Content>
        </Card>
        <Card style={{ flex: 1 }}>
          <Card.Content>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              Waste qty
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
              {(data?.total_waste_quantity ?? 0).toFixed(2)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Top driver: {data?.top_ingredients?.[0]?.label || 'Pending'}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Trend (cost)
          </Text>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <ActivityIndicator />
            </View>
          ) : filteredTrend.length === 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No waste logged for this range.
            </Text>
          ) : (
            filteredTrend.map(point => {
              const denom = data?.total_waste_cost && data.total_waste_cost > 0 ? data.total_waste_cost : 1;
              const progress = Math.min(point.total_cost / denom, 1);
              return (
                <View key={point.bucket_start} style={{ marginBottom: 8 }}>
                  <Text variant="bodySmall" style={{ marginBottom: 4 }}>
                    {point.bucket_start}
                  </Text>
                  <ProgressBar progress={progress} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {currency(point.total_cost)}
                  </Text>
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Top ingredients
          </Text>
          {(data?.top_ingredients || []).map(row => (
            <View key={row.key} style={{ paddingVertical: 6 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {row.label}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {currency(row.total_cost)} · {row.total_quantity.toFixed(2)}
              </Text>
            </View>
          ))}
          {!data?.top_ingredients?.length && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No data yet.
            </Text>
          )}
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Insights & actions
          </Text>
          {insights.map((insight, idx) => (
            <View key={idx} style={{ marginBottom: 10 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
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
            </View>
          ))}
          {!insights.length && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No insights yet.
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
