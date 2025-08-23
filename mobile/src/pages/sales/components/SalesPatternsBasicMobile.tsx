import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import DateSelector from '../../../components/DateSelector';
import { useSalesPatterns } from '../hooks/useSalesPatterns';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryBar,
  VictoryPie,
} from 'victory-native';
import { VictoryLabel } from 'victory-native';

// Simple color palette for series
const COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

function formatDate(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isValidDate(v: any) {
  const d = new Date(v);
  return !isNaN(d.getTime());
}

export default function SalesPatternsBasicMobile() {
  const theme = useTheme();
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    byRevenue,
    setByRevenue,
    normalize,
    setNormalize,
    salesOverTime,
    heatmapData,
    weekdayAvg,
    channelBreakdown,
    loading,
    error,
    refresh,
  } = useSalesPatterns();
  const [lastFetchAt, setLastFetchAt] = useState<string | null>(null);

  // nothing special on mount; use the hook's fetch. expose manual refresh below.

  // Helpers to render charts
  const renderSalesOverTime = () => {
    if (!Array.isArray(salesOverTime) || salesOverTime.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;
    // group by menu_item_name and compute totals (sanitize inputs)
    const byItem: Record<string, { x: Date; y: number }[]> = {};
    for (const r of salesOverTime) {
      if (!r) continue;
      const key = r.menu_item_name || r.menu_item_id || 'unknown';
  const dateVal = (r as any).sale_date;
      const dateOk = isValidDate(dateVal);
      const y = safeNum(r.metric);
      if (!dateOk || Number.isNaN(y)) {
        continue;
      }
      const x = new Date(dateVal);
      byItem[key] = byItem[key] || [];
      byItem[key].push({ x, y });
    }

    // pick top 3 items by total
    const totals = Object.keys(byItem).map(k => ({
      key: k,
      total: byItem[k].reduce((s: number, v: any) => s + safeNum(v.y), 0),
    }));
    totals.sort((a, b) => b.total - a.total);
    const top = totals.slice(0, 3).map(t => t.key);

    // guard: ensure at least one series has data
    if (top.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;

    // compute global y max across top series for dynamic scaling
    let globalMax = 0;
    for (const k of top) {
      const series = byItem[k] || [];
      for (const p of series) globalMax = Math.max(globalMax, Math.abs(p.y));
    }

    // ensure a minimum domain to avoid flat lines
    const yMax = globalMax > 0 ? globalMax * 1.15 : 1;

    // x domain should cover the selected date range so missing days are shown
    const xMin = isValidDate(startDate)
      ? new Date(startDate)
      : new Date((salesOverTime[0] as any).sale_date);
    const xMax = isValidDate(endDate)
      ? new Date(endDate)
      : new Date((salesOverTime[salesOverTime.length - 1] as any).sale_date);

    return (
      <View style={{ height: 260, overflow: 'hidden' }}>
        <VictoryChart
          theme={VictoryTheme.material}
          height={240}
          scale={{ x: 'time' }}
          domain={{ x: [xMin, xMax], y: [0, yMax] }}
          padding={{ left: 50, right: 30, top: 10, bottom: 50 }}
        >
          <VictoryAxis
            fixLabelOverlap
            tickFormat={t => {
              const dt = new Date(t);
              return isNaN(dt.getTime()) ? '' : `${dt.getMonth() + 1}/${dt.getDate()}`;
            }}
            tickCount={5}
            style={{ tickLabels: { fontSize: 10 } }}
          />
          <VictoryAxis
            dependentAxis
            tickFormat={v => (Math.abs(v) >= 1000 ? `${Math.round(v)}` : `${Math.round(v)}`)}
          />
          {top.map((k, i) => {
            const series = (byItem[k] || []).filter(p => p && typeof p.y === 'number');
            if (!series || series.length === 0) return null;
            // sort by x to ensure lines render correctly
            series.sort((a, b) => a.x.getTime() - b.x.getTime());
            return (
              <VictoryLine
                key={k}
                data={series}
                x="x"
                y="y"
                interpolation="monotoneX"
                style={{ data: { stroke: COLORS[i % COLORS.length], strokeWidth: 2 } }}
              />
            );
          })}
        </VictoryChart>
      </View>
    );
  };

  const renderHeatmapPreview = () => {
    // heatmapData expected: array of { menu_item_name, metric }
    if (!Array.isArray(heatmapData) || heatmapData.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;

    const list = heatmapData.slice(0, 10);
    if (list.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;
    const data = list.map((r: any) => ({
      x: r.menu_item_name || String(r.menu_item_id),
      y: safeNum(r.metric),
    }));
    const max = Math.max(...data.map(d => d.y));
    const height = Math.min(300, data.length * 36 + 60);
    return (
      <View style={{ height, overflow: 'hidden' }}>
        <VictoryChart
          horizontal
          domainPadding={{ x: 20, y: 8 }}
          height={height}
          padding={{ left: 120, right: 20, top: 10, bottom: 30 }}
        >
          <VictoryBar
            data={data}
            x="x"
            y="y"
            style={{ data: { fill: COLORS[1] } }}
            labels={({ datum }) => `${Math.round(datum.y)}`}
            labelComponent={<VictoryLabel dx={-8} />}
          />
        </VictoryChart>
      </View>
    );
  };

  const renderWeekdayAvg = () => {
    if (!Array.isArray(weekdayAvg) || weekdayAvg.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;
    const data = weekdayAvg
      .map((r: any) => ({
        x: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][r.weekday] ?? String(r.weekday),
        y: safeNum(r.metric),
      }))
      .filter((p: any) => typeof p.y === 'number' && !Number.isNaN(p.y));
    const max = data.reduce((s: number, d: any) => Math.max(s, Math.abs(d.y)), 0);
    const yMax = max > 0 ? max * 1.15 : 1;
    return (
      <View style={{ height: 220, overflow: 'hidden' }}>
        <VictoryChart
          domainPadding={20}
          theme={VictoryTheme.material}
          height={220}
          padding={{ left: 40, right: 30, top: 10, bottom: 50 }}
          domain={{ y: [0, yMax] }}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis tickFormat={v => `${Math.round(v)}`} />
          <VictoryBar data={data} style={{ data: { fill: COLORS[0] } }} />
        </VictoryChart>
      </View>
    );
  };

  const renderChannelBreakdown = () => {
    if (!Array.isArray(channelBreakdown) || channelBreakdown.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;
    const pieData = channelBreakdown
      .map((r: any, i: number) => ({
        x: r.sales_channel || r.channel || `ch${i}`,
        y: safeNum(r.metric),
      }))
      .filter((d: any) => typeof d.y === 'number' && !Number.isNaN(d.y));
    const total = pieData.reduce((s: number, r: any) => s + r.y, 0);
    if (pieData.length === 0 || total === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;
    return (
      <View
        style={{ height: 220, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
      >
        <VictoryPie
          data={pieData}
          colorScale={COLORS}
          height={200}
          labels={({ datum }) => `${datum.x}: ${Math.round((datum.y / total) * 100)}%`}
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Sales Patterns</Text>

      <DateSelector
        label="Select Date Range"
        startDate={new Date(startDate)}
        endDate={new Date(endDate)}
        onStartDateChange={d => setStartDate(formatDate(d))}
        onEndDateChange={d => setEndDate(formatDate(d))}
        mode="range"
        direction="backward"
      />

      <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 12, alignItems: 'center' }}>
        <Toggle
          label={byRevenue ? 'Viewing: Revenue' : 'Viewing: Count'}
          active={byRevenue}
          onPress={() => setByRevenue(!byRevenue)}
        />
        <Toggle
          label={normalize ? 'Normalize On' : 'Normalize Off'}
          active={normalize}
          onPress={() => setNormalize(!normalize)}
        />
        <TouchableOpacity
          onPress={async () => {
            if (refresh) {
              try {
                await refresh();
                setLastFetchAt(new Date().toISOString());
              } catch (e) {
                console.error('refresh failed', e);
              }
            }
          }}
          style={{
            backgroundColor: theme.colors.surfaceVariant,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            marginLeft: 8,
          }}
        >
          <Text style={{ fontSize: 12 }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: theme.colors.error }}>Error loading data</Text>}

      {!loading && !error && (
        <View>
          {lastFetchAt && (
            <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Last fetch: {new Date(lastFetchAt).toLocaleString()}
            </Text>
          )}
          {/* Sales Over Time */}
          <Card title="Sales Over Time by Item">{renderSalesOverTime()}</Card>

          {/* Heatmap preview */}
          <Card title="Sales Heatmap">{renderHeatmapPreview()}</Card>

          {/* Weekday avg */}
          <Card title="Average Sales by Weekday">{renderWeekdayAvg()}</Card>

          {/* Channel breakdown */}
          <Card title="Sales Channel Breakdown">{renderChannelBreakdown()}</Card>
        </View>
      )}
    </ScrollView>
  );
}

function Card({ title, children, style }: { title: string; children: any; style?: any }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
        // Paper provides elevation semantics; for RN we keep it minimal
        // while avoiding hardcoded shadow colors
        ...style,
      }}
    >
      <Text style={{ fontWeight: '600', marginBottom: 8 }}>{title}</Text>
      <View>{children}</View>
    </View>
  );
}

function Toggle({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
      }}
    >
      <Text
        style={{ color: active ? theme.colors.onPrimary : theme.colors.onSurface, fontSize: 12 }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
