import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useForecastAccuracy } from "../hooks/useForecastAccuracy";
import DateSelector from "../../../components/DateSelector";
import Svg from "react-native-svg";
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from "victory-native";

const COLORS = ['#2563eb','#ef4444','#f59e0b','#10b981','#8b5cf6','#06b6d4','#f97316','#a78bfa','#60a5fa','#84cc16','#fb7185','#34d399'];
function generateHueColor(i:number){ const h = (i*137.508)%360; return `hsl(${Math.round(h)},70%,45%)`; }

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export default function ForecastAccuracyBasicMobile() {
  const [startDate, setStartDate] = useState(formatDate(daysAgo(7)));
  const [endDate, setEndDate] = useState(formatDate(new Date()));
  const {
    filteredChartData,
    filteredTableData,
    chartData,
    tableData,
    computedData,
    selectedMenuItemIds,
    setSelectedMenuItemIds,
    loading,
    error,
  } = useForecastAccuracy(startDate, endDate);

  const allMenuItems = useMemo(() => {
    const combined = [...chartData, ...tableData, ...computedData];
    return Array.from(
      new Map(
        combined.map(({ menu_item_id, menu_item_name }) => [
          menu_item_id,
          menu_item_name,
        ])
      )
    );
  }, [chartData, tableData, computedData]);
  useEffect(() => {
    if (!selectedMenuItemIds.length && allMenuItems.length)
      setSelectedMenuItemIds(allMenuItems.map(([id]) => id));
  }, [allMenuItems, selectedMenuItemIds]);

  // build color map for menu items
  const colorMap = useMemo(() => {
    const m: Record<string,string> = {};
    allMenuItems.forEach(([id, name], idx) => {
      m[name] = COLORS[idx % COLORS.length] || generateHueColor(idx);
    });
    return m;
  }, [allMenuItems]);

  // group chart data by date for VictoryLine series
  const grouped = useMemo(() => {
    const g: Record<string, any> = {};
    filteredChartData.forEach((p:any) => {
  const d = p.date;
  if (!d) return;
  if (!g[d]) g[d] = { date: d };
  // clamp to 0-100 for charting
  const raw = Number(p.error_percentage ?? 0);
  const clamped = Math.max(0, Math.min(100, raw));
  g[d][p.menu_item_name] = clamped;
    });
    return Object.values(g).sort((a:any,b:any)=> a.date.localeCompare(b.date));
  }, [filteredChartData]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Forecast Accuracy
      </Text>
  {/* Date selector */}
  <DateSelector label="Select Date Range" startDate={new Date(startDate)} endDate={new Date(endDate)} onStartDateChange={(d)=> setStartDate(formatDate(d))} onEndDateChange={(d)=> setEndDate(formatDate(d))} mode="range" />
      {/* Menu item filter pills */}
      <ScrollView
        horizontal
        style={{ marginBottom: 12 }}
        showsHorizontalScrollIndicator={false}
      >
        {allMenuItems.map(([id, name]) => (
          <TouchableOpacity
            key={id}
            onPress={() =>
              setSelectedMenuItemIds((prev) =>
                prev.includes(id as number)
                  ? prev.filter((x) => x !== id)
                  : [...prev, id as number]
              )
            }
            style={{
              backgroundColor: selectedMenuItemIds.includes(id as number)
                ? "#2563eb"
                : "#e5e7eb",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 20,
              marginRight: 8,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: selectedMenuItemIds.includes(id as number)
                  ? "white"
                  : "#111827",
              }}
            >
              {name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color: "#dc2626" }}>{error}</Text>}
      {!loading && !error && (
        <>
          {/* Accuracy over time chart */}
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'600', marginBottom:8 }}>Daily Error %</Text>
            {grouped.length === 0 ? (
              <Text style={{ fontSize:12, color:'#555' }}>No data</Text>
            ) : (
              <>
                <Svg height={240} width="100%" viewBox="0 0 400 240">
                  <VictoryChart standalone={false} width={400} height={240} theme={VictoryTheme.material} domain={{ y: [0, 100] }}>
                    <VictoryAxis tickFormat={(t)=> String(t).slice(5)} style={{ tickLabels: { fontSize: 10 } }} />
                    <VictoryAxis dependentAxis tickFormat={(v)=> `${Number(v).toFixed(1)}%`} style={{ tickLabels: { fontSize: 10 } }} />
                    {Object.keys(grouped[0]).filter(k=> k!=='date').map((key, idx) => (
                      <VictoryLine key={key} data={grouped.map((r:any)=> ({ x: r.date, y: Number(r[key]||0) }))} style={{ data:{ stroke: colorMap[key] || generateHueColor(idx) } }} />
                    ))}
                  </VictoryChart>
                </Svg>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:8 }}>
                  {Object.keys(grouped[0]).filter(k=> k!=='date').map((key,i)=> (
                    <View key={key} style={{ flexDirection:'row', alignItems:'center', marginRight:12 }}>
                      <View style={{ width:12, height:12, backgroundColor: colorMap[key] || generateHueColor(i), borderRadius:3, marginRight:6 }} />
                      <Text style={{ fontSize:12 }}>{key}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
          <View style={{ backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ fontWeight: '600', marginBottom: 8 }}>Accuracy Table</Text>
            <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
              {filteredTableData.length === 0 && (<Text style={{ fontSize: 12, color: '#555' }}>No rows.</Text>)}
              {filteredTableData.map((row: any, i: number) => {
                const raw = Number(row.error_percentage ?? row.error ?? row.accuracy_percent ?? row.accuracy ?? 0);
                const val = Math.max(0, Math.min(100, raw));
                return (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                    <Text style={{ flex: 1 }}>{row.menu_item_name}</Text>
                    <Text style={{ width: 120 }}>{row.date ?? ''}</Text>
                    <Text style={{ width: 60, textAlign: 'right', fontWeight: '600' }}>{`${val.toFixed(1)}%`}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </ScrollView>
  );
}
