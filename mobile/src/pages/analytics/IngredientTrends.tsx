import React from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Text, useTheme } from 'react-native-paper';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLegend,
  VictoryLine,
  VictoryTheme,
  VictoryVoronoiContainer,
} from 'victory-native';
import { useIngredientCostTrends } from './hooks/useIngredientCostTrends';

const colors = ['#2563eb', '#fb7185', '#22c55e', '#f59e0b', '#a855f7', '#0ea5e9'];
const currency = (value: number) => `$${(value ?? 0).toFixed(2)}`;

export default function IngredientTrends() {
  const theme = useTheme();
  const {
    startDate,
    endDate,
    granularity,
    setGranularity,
    query,
    plotSeries,
    topMovers,
    setQuickRange,
  } = useIngredientCostTrends();

  const legendData = plotSeries.slice(0, 4).map((series, idx) => ({
    name: series.label,
    symbol: { fill: colors[idx % colors.length] },
  }));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.background }}>
      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            Profit & Waste Analytics
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 4 }}>
            Ingredient Cost Trends
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
            Delivered purchase orders, grouped by {granularity}. Quick filters help you spot spikes
            fast.
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 6, fontWeight: '600' }}>
            {startDate} → {endDate}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Range & granularity
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {[30, 60, 90].map(days => (
              <Chip key={days} mode="outlined" onPress={() => setQuickRange(days)}>
                Last {days}d
              </Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              selected={granularity === 'daily'}
              onPress={() => setGranularity('daily')}
              mode={granularity === 'daily' ? 'flat' : 'outlined'}
            >
              Daily
            </Chip>
            <Chip
              selected={granularity === 'weekly'}
              onPress={() => setGranularity('weekly')}
              mode={granularity === 'weekly' ? 'flat' : 'outlined'}
            >
              Weekly
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 12, fontWeight: '700' }}>
            Cost over time
          </Text>
          {query.isLoading || query.isFetching ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator />
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                Loading delivered PO items…
              </Text>
            </View>
          ) : plotSeries.length === 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              No delivered purchase order lines in this range.
            </Text>
          ) : (
            <VictoryChart
              height={320}
              padding={{ left: 60, right: 30, top: 30, bottom: 60 }}
              theme={VictoryTheme.material}
              containerComponent={
                <VictoryVoronoiContainer
                  labels={({ datum }) => `${datum.x}\n${currency(Number(datum.y))}`}
                  voronoiDimension="x"
                />
              }
            >
              <VictoryLegend
                x={40}
                y={0}
                orientation="horizontal"
                gutter={12}
                itemsPerRow={2}
                data={legendData}
              />
              <VictoryAxis
                tickFormat={t => t.slice(5)}
                style={{ tickLabels: { angle: 0, fontSize: 10 } }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={t => `$${Number(t).toFixed(0)}`}
                style={{ tickLabels: { fontSize: 10 } }}
              />
              {plotSeries.slice(0, 4).map((series, idx) => (
                <VictoryLine
                  key={series.label}
                  data={series.data}
                  x="x"
                  y="y"
                  interpolation="monotoneX"
                  style={{ data: { stroke: colors[idx % colors.length], strokeWidth: 2.5 } }}
                />
              ))}
            </VictoryChart>
          )}
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Movers to watch
          </Text>
          {topMovers.map(mover => (
            <View
              key={mover.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 10,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '700' }}>
                  {mover.name}
                </Text>
              </View>
              <Chip mode="outlined" selected={mover.changePct > 0} style={{ minWidth: 90 }}>
                {mover.changePct >= 0 ? '+' : ''}
                {mover.changePct.toFixed(1)}%
              </Chip>
            </View>
          ))}
          {topMovers.length === 0 && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Need more buckets to calculate movers.
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
