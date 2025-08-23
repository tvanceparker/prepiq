import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import DateSelector from '../../../components/DateSelector';
import { useSalesPatterns } from '../hooks/useSalesPatterns';
// imports for reusable graphs
import { SalesOverTimeGraph, type SalesSeries } from '../../dashboard/graphs/SalesOverTimeGraph';
import { WeekdayBarGraph } from '../../dashboard/graphs/WeekdayBarGraph';
import { HeatmapPreviewGraph } from '../../dashboard/graphs/HeatmapPreviewGraph';
import { ChannelBreakdownPie } from '../../dashboard/graphs/ChannelBreakdownPie';
import { Button, Checkbox, Text as PaperText, TextInput as PaperInput } from 'react-native-paper';

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
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
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
    // group by menu_item_id with name mapping and compute totals (sanitize inputs)
    const byItem: Record<string, { x: Date; y: number }[]> = {};
    const nameById: Record<string, string> = {};
    for (const r of salesOverTime) {
      if (!r) continue;
      const id = (r as any).menu_item_id ?? (r as any).menuItemId;
      const name = (r as any).menu_item_name || (r as any).name || String(id ?? 'unknown');
      const key = String(id ?? name);
      const dateVal = (r as any).sale_date;
      const dateOk = isValidDate(dateVal);
      const y = safeNum(r.metric);
      if (!dateOk || Number.isNaN(y)) {
        continue;
      }
      const x = new Date(dateVal);
      byItem[key] = byItem[key] || [];
      byItem[key].push({ x, y });
      nameById[key] = name;
    }

    // Build selection list from current dataset
    const optionEntries = Object.keys(byItem)
      .map(id => ({ id, name: nameById[id] || `Item ${id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // filter series by selected IDs (if any selected)
    let keys = Object.keys(byItem);
    if (selectedItemIds.length > 0) {
      const set = new Set(selectedItemIds);
      keys = keys.filter(k => set.has(k));
    }

    // guard
    if (keys.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;

    // compute global y max across selected series
    let globalMax = 0;
    for (const k of keys) {
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

    // Prepare series for reusable graph with legend
    const series: SalesSeries[] = keys.map((k, i) => {
      const pts = (byItem[k] || [])
        .filter((p: any) => p && typeof p.y === 'number')
        .sort((a: any, b: any) => new Date(a.x).getTime() - new Date(b.x).getTime());
      const label = nameById[k] || String(k);
      return { key: label, color: COLORS[i % COLORS.length], points: pts };
    });
    return (
      <>
        {/* Item picker trigger */}
        <View style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
          <Button mode="outlined" onPress={() => setItemPickerOpen(true)}>
            Select Items ({selectedItemIds.length || optionEntries.length})
          </Button>
          {selectedItemIds.length > 0 && (
            <Button mode="text" onPress={() => setSelectedItemIds([])} style={{ marginLeft: 8 }}>
              Clear
            </Button>
          )}
        </View>

        <SalesOverTimeGraph series={series} xMin={xMin} xMax={xMax} yMax={yMax} />

        {/* Item picker bottom sheet */}
        <Modal
          visible={itemPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setItemPickerOpen(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <Pressable
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              onPress={() => setItemPickerOpen(false)}
            />
            <View
              style={{
                backgroundColor: theme.colors.surface,
                padding: 16,
                paddingBottom: 20,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                width: '100%',
                maxHeight: '75%',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                Select Menu Items
              </Text>
              <PaperText style={{ marginBottom: 6 }}>Showing items in current date range</PaperText>
              <PaperInput
                mode="outlined"
                label="Search items"
                value={itemSearch}
                onChangeText={setItemSearch}
                style={{ marginBottom: 10 }}
              />
              <View style={{ maxHeight: 360 }}>
                <ScrollView>
                  {optionEntries
                    .filter(opt =>
                      itemSearch ? opt.name.toLowerCase().includes(itemSearch.toLowerCase()) : true
                    )
                    .map(opt => {
                      const checked = selectedItemIds.includes(opt.id);
                      return (
                        <Checkbox.Item
                          key={opt.id}
                          label={opt.name}
                          status={checked ? 'checked' : 'unchecked'}
                          onPress={() => {
                            setSelectedItemIds(prev =>
                              checked ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                            );
                          }}
                        />
                      );
                    })}
                </ScrollView>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <Button onPress={() => setSelectedItemIds(optionEntries.map(o => o.id))}>
                  All
                </Button>
                <Button onPress={() => setSelectedItemIds([])}>None</Button>
                <Button onPress={() => setItemPickerOpen(false)}>Done</Button>
              </View>
            </View>
          </View>
        </Modal>
      </>
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
    return <HeatmapPreviewGraph items={data} />;
  };

  const renderWeekdayAvg = () => {
    if (!Array.isArray(weekdayAvg) || weekdayAvg.length === 0)
      return <Text style={{ color: theme.colors.onSurfaceVariant }}>No data</Text>;

    // Build a fixed 7-slot map for Sun..Sat so all weekdays appear; accept numeric or string weekday formats
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const values: number[] = new Array(7).fill(0);

    const parseWeekdayIndex = (raw: any): number | null => {
      if (raw == null) return null;
      // numeric-like
      const n = Number(raw);
      if (!Number.isNaN(n)) {
        // if 0-6 -> assume JS Date.getDay() mapping
        if (n >= 0 && n <= 6) return n;
        // if 1-7 -> assume ISO-style (1=Mon..7=Sun) -> convert to 0=Sun..6=Sat
        if (n >= 1 && n <= 7) return n % 7; // 7 -> 0 (Sun)
      }
      // string names e.g. 'Sun', 'sunday', 'SATURDAY'
      const s = String(raw).toLowerCase().slice(0, 3);
      const nameMap: Record<string, number> = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
      };
      if (s in nameMap) return nameMap[s];
      return null;
    };

    // Populate and sum values from backend (handle average_value, metric, or value)
    for (const r of weekdayAvg) {
      const wdIdx = parseWeekdayIndex((r as any).weekday);
      if (wdIdx == null) continue;
      const v = Number((r as any).average_value ?? (r as any).metric ?? (r as any).value ?? 0) || 0;
      values[wdIdx] = (values[wdIdx] || 0) + v;
    }

    return <WeekdayBarGraph labels={labels} values={values} color={COLORS[0]} />;
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
    return <ChannelBreakdownPie data={pieData} />;
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

      {/* Item picker button is rendered inside the Sales Over Time card above */}

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
