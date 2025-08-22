import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import DateSelector from "../../../components/DateSelector";
import { useSalesPatterns } from "../hooks/useSalesPatterns";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryBar,
  VictoryPie,
} from "victory-native";

// Simple color palette for series
const COLORS = ["#2563eb", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
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
      return <Text style={{ color: "#555" }}>No data</Text>;

    // group by menu_item_name and compute totals (sanitize inputs)
    const byItem: Record<string, any[]> = {};
    for (const r of salesOverTime) {
      if (!r) continue;
      const key = r.menu_item_name || r.menu_item_id || "unknown";
      const dateOk = isValidDate(r.sale_date);
      const y = safeNum(r.metric);
      if (!dateOk || y === 0) {
        // skip invalid date or zero-value rows to avoid NaN noise
        continue;
      }
      byItem[key] = byItem[key] || [];
      byItem[key].push({ x: new Date(r.sale_date).toISOString(), y });
    }

    // pick top 3 items by total
    const totals = Object.keys(byItem).map((k) => ({
      key: k,
      total: byItem[k].reduce((s: number, v: any) => s + safeNum(v.y), 0),
    }));
    totals.sort((a, b) => b.total - a.total);
    const top = totals.slice(0, 3).map((t) => t.key);

    // guard: ensure at least one series has data
    if (top.length === 0) return <Text style={{ color: "#555" }}>No data</Text>;

    return (
      <VictoryChart
        theme={VictoryTheme.material}
        height={220}
        padding={{ left: 50, right: 30, top: 10, bottom: 50 }}
      >
        <VictoryAxis
          fixLabelOverlap
          tickFormat={(t) => {
            const dt = new Date(t);
            return isNaN(dt.getTime()) ? "" : `${dt.getMonth() + 1}/${dt.getDate()}`;
          }}
        />
        <VictoryAxis dependentAxis />
        {top.map((k, i) => {
          const series = (byItem[k] || []).filter((p) => p && typeof p.y === "number");
          if (!series || series.length === 0) return null;
          return (
            <VictoryLine
              key={k}
              data={series}
              interpolation="monotoneX"
              style={{ data: { stroke: COLORS[i % COLORS.length], strokeWidth: 2 } }}
            />
          );
        })}
      </VictoryChart>
    );
  };

  const renderHeatmapPreview = () => {
    // heatmapData expected: array of { menu_item_name, metric }
    if (!Array.isArray(heatmapData) || heatmapData.length === 0)
      return <Text style={{ color: "#555" }}>No data</Text>;

  const max = Math.max(...heatmapData.map((r: any) => safeNum(r.metric)));
    return (
      <View style={{ flexDirection: "column" }}>
        {heatmapData.slice(0, 10).map((r: any, idx: number) => {
          const v = safeNum(r.metric);
          const intensity = max > 0 ? Math.round((v / max) * 255) : 0;
          const bg = `rgb(${240 - intensity}, ${
            248 - Math.round(intensity / 2)
          }, ${255 - intensity})`;
          return (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: bg,
                  borderRadius: 2,
                  marginRight: 8,
                }}
              />
              <Text style={{ flex: 1 }}>
                {r.menu_item_name || r.menu_item_id}
              </Text>
              <Text style={{ width: 80, textAlign: "right" }}>
                {Math.round(v)}
              </Text>
            </View>
          );
        })}
        <Text style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
          Heatmap preview — tap to open detailed view (TBD)
        </Text>
      </View>
    );
  };

  const renderWeekdayAvg = () => {
    if (!Array.isArray(weekdayAvg) || weekdayAvg.length === 0)
      return <Text style={{ color: "#555" }}>No data</Text>;
    const data = weekdayAvg
      .map((r: any) => ({ x: r.weekday, y: safeNum(r.metric) }))
      .filter((p: any) => typeof p.y === "number" && !Number.isNaN(p.y));
    return (
      <VictoryChart
        domainPadding={20}
        theme={VictoryTheme.material}
        height={220}
        padding={{ left: 50, right: 30, top: 10, bottom: 50 }}
      >
        <VictoryAxis />
        <VictoryAxis dependentAxis />
        <VictoryBar data={data} style={{ data: { fill: COLORS[0] } }} />
      </VictoryChart>
    );
  };

  const renderChannelBreakdown = () => {
    if (!Array.isArray(channelBreakdown) || channelBreakdown.length === 0)
      return <Text style={{ color: "#555" }}>No data</Text>;
    const pieData = channelBreakdown
      .map((r: any, i: number) => ({ x: r.sales_channel || r.channel || `ch${i}`, y: safeNum(r.metric) }))
      .filter((d: any) => typeof d.y === "number" && !Number.isNaN(d.y));
    const total = pieData.reduce((s: number, r: any) => s + r.y, 0);
    if (pieData.length === 0 || total === 0) return <Text style={{ color: "#555" }}>No data</Text>;
    return (
      <VictoryPie data={pieData} colorScale={COLORS} height={220} labels={({ datum }) => `${datum.x}: ${Math.round((datum.y / total) * 100)}%`} />
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Sales Patterns
      </Text>

      <DateSelector
        label="Select Date Range"
        startDate={new Date(startDate)}
        endDate={new Date(endDate)}
        onStartDateChange={(d) => setStartDate(formatDate(d))}
        onEndDateChange={(d) => setEndDate(formatDate(d))}
        mode="range"
        direction="backward"
      />

      <View style={{ flexDirection: "row", marginTop: 12, marginBottom: 12, alignItems: 'center' }}>
        <Toggle label={byRevenue ? "Viewing: Revenue" : "Viewing: Count"} active={byRevenue} onPress={() => setByRevenue(!byRevenue)} />
        <Toggle label={normalize ? "Normalize On" : "Normalize Off"} active={normalize} onPress={() => setNormalize(!normalize)} />
        <TouchableOpacity
          onPress={async () => { if (refresh) { try { await refresh(); setLastFetchAt(new Date().toISOString()); } catch (e) { console.error('refresh failed', e); } } }}
          style={{ backgroundColor: "#e2e8f0", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 }}
        >
          <Text style={{ fontSize: 12 }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: "#dc2626" }}>Error loading data</Text>}

      {!loading && !error && (
        <View>
          {lastFetchAt && <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Last fetch: {new Date(lastFetchAt).toLocaleString()}</Text>}
          {/* Sales Over Time */}
          <Card title="Sales Over Time by Item">{renderSalesOverTime()}</Card>

          {/* Heatmap preview */}
          <Card title="Sales Heatmap">{renderHeatmapPreview()}</Card>

          {/* Weekday avg */}
          <Card title="Average Sales by Weekday">{renderWeekdayAvg()}</Card>

          {/* Channel breakdown */}
          <Card title="Sales Channel Breakdown">
            {renderChannelBreakdown()}
          </Card>
        </View>
      )}
    </ScrollView>
  );
}

function Card({ title, children }: { title: string; children: any }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
      }}
    >
      <Text style={{ fontWeight: "600", marginBottom: 8 }}>{title}</Text>
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
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: active ? "#2563eb" : "#e5e7eb",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
      }}
    >
      <Text style={{ color: active ? "white" : "#111827", fontSize: 12 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
