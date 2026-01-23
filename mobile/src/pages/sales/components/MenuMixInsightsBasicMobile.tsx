import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme, Card, Chip, Divider } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import useMenuMixInsights from '../hooks/useMenuMixInsights';
import DateSelector from '../../../components/DateSelector';
import { getSalesDateRange } from '../../../api/forecast';
import Svg from 'react-native-svg';
import {
  VictoryPie,
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
} from 'victory-native';

const COLORS = [
  '#2563eb',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#a78bfa',
  '#60a5fa',
  '#84cc16',
  '#fb7185',
  '#34d399',
];

function generateHueColor(i: number) {
  // generate an HSL color distributed across the hue wheel
  const h = (i * 137.508) % 360; // golden angle for distribution
  return `hsl(${Math.round(h)}, 70%, 45%)`;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getMarginColor(marginPct: number) {
  if (marginPct >= 60) return '#10b981';
  if (marginPct >= 40) return '#f59e0b';
  return '#ef4444';
}

export default function MenuMixInsightsBasicMobile() {
  const theme = useTheme();
  const defaultEnd = daysAgo(0);
  const defaultStart = daysAgo(7);
  const [startDate, setStartDate] = useState(fmt(defaultStart));
  const [endDate, setEndDate] = useState(fmt(defaultEnd));
  const [autoRange, setAutoRange] = useState(true);
  const [byRevenue, setByRevenue] = useState(true);
  const [showTreemap, setShowTreemap] = useState(false);
  const [topCount, setTopCount] = useState(10);
  const {
    breakdownData,
    overTimeData,
    topBottomData,
    selectedMenuItemIds,
    setSelectedMenuItemIds,
    loading,
    topView,
    setTopView,
  } = useMenuMixInsights(startDate, endDate, byRevenue, topCount);

  const { data: salesDateRange } = useQuery({
    queryKey: ['salesDateRange'],
    queryFn: getSalesDateRange,
  });

  useEffect(() => {
    if (!autoRange) return;
    const minDate = salesDateRange?.min_date;
    const maxDate = salesDateRange?.max_date;
    if (minDate && maxDate) {
      setStartDate(minDate);
      setEndDate(maxDate);
    }
  }, [salesDateRange, autoRange]);
  const allMenuItems = useMemo(() => {
    const combined = [...breakdownData, ...overTimeData, ...topBottomData];
    return Array.from(
      new Map(combined.map(({ menu_item_id, menu_item_name }) => [menu_item_id, menu_item_name]))
    );
  }, [breakdownData, overTimeData, topBottomData]);
  // map menu item name -> color for consistent coloring across charts
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allMenuItems.forEach(([id, name], idx) => {
      // prefer the hard-coded palette first then fall back to generated hues
      map[name] = COLORS[idx % COLORS.length] || generateHueColor(idx);
    });
    // if there are more unique names than COLORS, ensure generated colors for the overflow
    if (allMenuItems.length > COLORS.length) {
      allMenuItems.forEach(([id, name], idx) => {
        if (!map[name]) map[name] = generateHueColor(idx);
      });
    }
    return map;
  }, [allMenuItems]);
  useEffect(() => {
    if (allMenuItems.length > 0 && selectedMenuItemIds.length === 0)
      setSelectedMenuItemIds(allMenuItems.map(([id]) => id));
  }, [allMenuItems, selectedMenuItemIds]);

  const filteredBreakdown =
    selectedMenuItemIds.length === 0
      ? breakdownData
      : breakdownData.filter((item: any) => selectedMenuItemIds.includes(item.menu_item_id));
  // Aggregate breakdown by menu_item_id so the pie shows total metric per item
  const aggregatedBreakdown = useMemo(() => {
    const m = new Map<any, { menu_item_id: any; menu_item_name: string; metric: number }>();
    filteredBreakdown.forEach((it: any) => {
      const id = it.menu_item_id ?? it.menu_item_name;
      const name = it.menu_item_name ?? String(id);
      // API sends metric rounded to 2 decimals for both revenue and quantity
      // keep numeric value but formatting is done in the UI below
      const val = Number(it.metric) || 0;
      if (!m.has(id)) m.set(id, { menu_item_id: id, menu_item_name: name, metric: val });
      else m.get(id)!.metric += val;
    });
    return Array.from(m.values()).sort((a, b) => b.metric - a.metric);
  }, [filteredBreakdown]);
  const filteredOverTime =
    selectedMenuItemIds.length === 0
      ? overTimeData
      : overTimeData.filter((item: any) => selectedMenuItemIds.includes(item.menu_item_id));
  const filteredTopBottom =
    selectedMenuItemIds.length === 0
      ? topBottomData
      : topBottomData.filter((item: any) => selectedMenuItemIds.includes(item.menu_item_id));

  const groupedOverTime = useMemo(() => {
    const grouped: Record<string, any> = {};
    filteredOverTime.forEach((row: any) => {
      const { sale_date, menu_item_name, metric } = row;
      if (!sale_date || !menu_item_name) return;
      if (!grouped[sale_date]) grouped[sale_date] = { date: sale_date };
      grouped[sale_date][menu_item_name] = metric;
    });
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredOverTime]);

  const groupedTopBottomForChart = useMemo(() => {
    return (
      topView ? filteredTopBottom.slice(0, topCount) : filteredTopBottom.slice(-topCount)
    ).map((d: any) => ({
      x: d.menu_item_name || String(d.menu_item_id),
      y: Number(d.metric) || 0,
    }));
  }, [filteredTopBottom, topView, topCount]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 4 }}>
        Menu Mix Insights
      </Text>
      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
        Profitability, trends, and performance by item
      </Text>
      <View style={{ marginBottom: 12 }}>
        <DateSelector
          label="Select Date Range"
          startDate={new Date(startDate)}
          endDate={new Date(endDate)}
          onStartDateChange={d => {
            setAutoRange(false);
            setStartDate(fmt(d));
          }}
          onEndDateChange={d => {
            setAutoRange(false);
            setEndDate(fmt(d));
          }}
          mode="range"
          direction="backward"
        />
      </View>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Toggle label="Revenue $" active={byRevenue} onPress={() => setByRevenue(true)} />
        <Toggle label="Quantity" active={!byRevenue} onPress={() => setByRevenue(false)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {allMenuItems.map(([id, name]) => (
          <Chip
            key={id}
            mode={selectedMenuItemIds.includes(id as number) ? 'flat' : 'outlined'}
            selected={selectedMenuItemIds.includes(id as number)}
            onPress={() =>
              setSelectedMenuItemIds(prev =>
                prev.includes(id as number) ? prev.filter(x => x !== id) : [...prev, id as number]
              )
            }
            style={{ marginRight: 8, backgroundColor: theme.colors.surface }}
            textStyle={{ fontSize: 12 }}
          >
            {name}
          </Chip>
        ))}
      </ScrollView>
      {loading && <ActivityIndicator />}
      {!loading && (
        <>
          {/* Breakdown with Pie chart and Treemap toggle placeholder */}
          <SectionCard title={`Breakdown (${byRevenue ? 'Revenue' : 'Qty'})`}>
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <Chip
                compact
                mode={!showTreemap ? 'flat' : 'outlined'}
                selected={!showTreemap}
                onPress={() => setShowTreemap(false)}
                style={{ marginRight: 8 }}
              >
                Pie
              </Chip>
              <Chip
                compact
                mode={showTreemap ? 'flat' : 'outlined'}
                selected={showTreemap}
                onPress={() => setShowTreemap(true)}
              >
                Treemap
              </Chip>
            </View>
            {!showTreemap ? (
              aggregatedBreakdown.length === 0 ? (
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>No data</Text>
              ) : (
                <>
                  <Svg height={260} width="100%" viewBox="0 0 400 260">
                    <VictoryPie
                      standalone={false}
                      width={400}
                      height={260}
                      animate={{ duration: 750, easing: 'cubicInOut' }}
                      padAngle={1}
                      data={aggregatedBreakdown.map((b: any) => ({
                        x: b.menu_item_name,
                        y: Number(b.metric) || 0,
                      }))}
                      // hide labels on slices (we render a legend below instead)
                      labels={() => null}
                      colorScale={aggregatedBreakdown.map(
                        (b, i) => colorMap[b.menu_item_name] || COLORS[i % COLORS.length]
                      )}
                    />
                  </Svg>

                  {/* Legend: clean list with color swatch and value to avoid overlapping slice labels */}
                  <View style={{ marginTop: 8 }}>
                    {aggregatedBreakdown.slice(0, 12).map((b: any, i: number) => (
                      <View
                        key={b.menu_item_id ?? b.menu_item_name}
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                      >
                        <View
                          style={{
                            width: 14,
                            height: 14,
                            backgroundColor:
                              colorMap[b.menu_item_name] || COLORS[i % COLORS.length],
                            borderRadius: 3,
                            marginRight: 8,
                          }}
                        />
                        <Text style={{ flex: 1 }}>{b.menu_item_name}</Text>
                        <Text style={{ fontWeight: '600' }}>
                          {byRevenue
                            ? `$${Number(b.metric).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : Number(Math.round(b.metric)).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              )
            ) : (
              <Text style={{ fontSize: 12, color: '#555' }}>
                Treemap view coming soon (mobile-optimized)
              </Text>
            )}
          </SectionCard>
          <SectionCard title="Item Profitability Analysis">
            {filteredBreakdown.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>No data</Text>
            ) : (
              <View>
                {filteredBreakdown.map((item: any, idx: number) => {
                  const revenue = Number(item.revenue || 0);
                  const totalCost = Number(item.total_cost ?? item.cost ?? 0);
                  const recipeCost = Number(item.recipe_cost ?? item.cost ?? 0);
                  const profit = Number(item.contribution_margin ?? revenue - totalCost);
                  const marginPct = Number(
                    item.gross_margin_pct ?? (revenue > 0 ? (profit / revenue) * 100 : 0)
                  );
                  const foodCostPct = Number(
                    item.food_cost_pct ?? (revenue > 0 ? (totalCost / revenue) * 100 : 0)
                  );

                  return (
                    <View
                      key={`${item.menu_item_id}-${item.sales_channel}-${idx}`}
                      style={{
                        paddingVertical: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <Text style={{ fontWeight: '600', flex: 1, marginRight: 8 }}>
                          {item.menu_item_name || 'Unknown'}
                        </Text>
                        <Chip compact mode="outlined">
                          {item.sales_channel || 'N/A'}
                        </Chip>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <Chip compact style={{ marginRight: 6, marginBottom: 6 }}>
                          Qty {Number(item.quantity_sold || 0).toLocaleString()}
                        </Chip>
                        <Chip compact style={{ marginRight: 6, marginBottom: 6 }}>
                          Rev {formatCurrency(revenue)}
                        </Chip>
                        <Chip compact style={{ marginRight: 6, marginBottom: 6 }}>
                          Recipe {formatCurrency(recipeCost)}
                        </Chip>
                        <Chip compact style={{ marginRight: 6, marginBottom: 6 }}>
                          Total {formatCurrency(totalCost)}
                        </Chip>
                        <Chip compact style={{ marginRight: 6, marginBottom: 6 }}>
                          Profit {formatCurrency(profit)}
                        </Chip>
                        <Chip
                          compact
                          style={{ marginRight: 6, marginBottom: 6 }}
                          textStyle={{ color: getMarginColor(marginPct) }}
                        >
                          Margin {formatPercent(marginPct)}
                        </Chip>
                        <Chip compact style={{ marginBottom: 6 }}>
                          Food {formatPercent(foodCostPct)}
                        </Chip>
                      </View>
                      {idx < filteredBreakdown.length - 1 && (
                        <Divider style={{ marginTop: 10 }} />
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
          <SectionCard title="Sales Over Time">
            {groupedOverTime.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>No data</Text>
            ) : (
              <>
                <Svg height={240} width="100%" viewBox="0 0 400 240">
                  <VictoryChart
                    standalone={false}
                    width={400}
                    height={240}
                    theme={VictoryTheme.material}
                  >
                    <VictoryAxis
                      tickFormat={t => String(t).slice(5)}
                      style={{ tickLabels: { fontSize: 10 } }}
                    />
                    <VictoryAxis
                      dependentAxis
                      tickFormat={v =>
                        byRevenue
                          ? `$${Number(v).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : String(Number(Math.round(v)))
                      }
                      style={{ tickLabels: { fontSize: 10 } }}
                    />
                    {groupedOverTime.length > 0 &&
                      Object.keys(groupedOverTime[0])
                        .filter(k => k !== 'date')
                        .map((key, idx) => (
                          <VictoryLine
                            key={key}
                            data={groupedOverTime.map((r: any) => ({
                              x: r.date,
                              y: Number(r[key] || 0),
                            }))}
                            animate={{ duration: 600 }}
                            style={{ data: { stroke: colorMap[key] || generateHueColor(idx) } }}
                          />
                        ))}
                  </VictoryChart>
                </Svg>

                {/* Legend for Sales Over Time (scrollable horizontally if many items) */}
                {groupedOverTime.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 8 }}
                  >
                    {Object.keys(groupedOverTime[0])
                      .filter(k => k !== 'date')
                      .map((key, i) => (
                        <View
                          key={key}
                          style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}
                        >
                          <View
                            style={{
                              width: 12,
                              height: 12,
                              backgroundColor: colorMap[key] || generateHueColor(i),
                              borderRadius: 3,
                              marginRight: 6,
                            }}
                          />
                          <Text style={{ fontSize: 12 }}>{key}</Text>
                        </View>
                      ))}
                  </ScrollView>
                )}
              </>
            )}
          </SectionCard>

          {/* Top / Bottom with controls */}
          <SectionCard title="Top / Bottom">
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Chip
                compact
                mode={topView ? 'flat' : 'outlined'}
                selected={topView}
                onPress={() => setTopView(true)}
                style={{ marginRight: 8 }}
              >
                Top
              </Chip>
              <Chip
                compact
                mode={!topView ? 'flat' : 'outlined'}
                selected={!topView}
                onPress={() => setTopView(false)}
                style={{ marginRight: 8 }}
              >
                Bottom
              </Chip>
              <Chip
                compact
                mode="outlined"
                onPress={() => setTopCount(c => Math.max(5, Math.min(25, c + 5)))}
              >
                +5
              </Chip>
            </View>
            {filteredTopBottom.length === 0 ? (
              <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>No data</Text>
            ) : (
              <Svg height={260} width="100%" viewBox="0 0 400 260">
                <VictoryChart
                  standalone={false}
                  width={400}
                  height={260}
                  domainPadding={{ x: 40, y: 20 }}
                >
                  <VictoryAxis
                    tickFormat={t => String(t).slice(0, 8)}
                    style={{ tickLabels: { fontSize: 9 } }}
                  />
                  <VictoryAxis
                    dependentAxis
                    tickFormat={v =>
                      byRevenue
                        ? `$${Number(v).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : String(Number(Math.round(v)))
                    }
                    style={{ tickLabels: { fontSize: 10 } }}
                  />
                  <VictoryBar
                    data={groupedTopBottomForChart}
                    animate={{ duration: 650 }}
                    style={{ data: { fill: ({ datum }) => colorMap[datum.x] || '#2563eb' } }}
                  />
                </VictoryChart>
              </Svg>
            )}
          </SectionCard>
        </>
      )}
    </ScrollView>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Card style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}>
      <Card.Content>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>{title}</Text>
        {children}
      </Card.Content>
    </Card>
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
        backgroundColor: active ? '#2563eb' : '#e5e7eb',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
      }}
    >
      <Text style={{ color: active ? 'white' : '#111827', fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );
}
