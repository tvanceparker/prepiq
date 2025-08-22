import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import useMenuMixInsights from "../hooks/useMenuMixInsights";
import DateSelector from "../../../components/DateSelector";
import Svg from "react-native-svg";
import { VictoryPie, VictoryChart, VictoryLine, VictoryBar, VictoryAxis, VictoryTheme, VictoryLabel } from "victory-native";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function MenuMixInsightsBasicMobile() {
  const defaultEnd = daysAgo(0);
  const defaultStart = daysAgo(7);
  const [startDate, setStartDate] = useState(fmt(defaultStart));
  const [endDate, setEndDate] = useState(fmt(defaultEnd));
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
  const allMenuItems = useMemo(() => {
    const combined = [...breakdownData, ...overTimeData, ...topBottomData];
    return Array.from(
      new Map(
        combined.map(({ menu_item_id, menu_item_name }) => [
          menu_item_id,
          menu_item_name,
        ])
      )
    );
  }, [breakdownData, overTimeData, topBottomData]);
  useEffect(() => {
    if (allMenuItems.length > 0 && selectedMenuItemIds.length === 0)
      setSelectedMenuItemIds(allMenuItems.map(([id]) => id));
  }, [allMenuItems, selectedMenuItemIds]);

  const filteredBreakdown =
    selectedMenuItemIds.length === 0
      ? breakdownData
      : breakdownData.filter((item) =>
          selectedMenuItemIds.includes(item.menu_item_id)
        );
  const filteredOverTime =
    selectedMenuItemIds.length === 0
      ? overTimeData
      : overTimeData.filter((item) =>
          selectedMenuItemIds.includes(item.menu_item_id)
        );
  const filteredTopBottom =
    selectedMenuItemIds.length === 0
      ? topBottomData
      : topBottomData.filter((item) =>
          selectedMenuItemIds.includes(item.menu_item_id)
        );

  const groupedOverTime = useMemo(() => {
    const grouped: Record<string, any> = {};
    filteredOverTime.forEach(({ sale_date, menu_item_name, metric }) => {
      if (!sale_date || !menu_item_name) return;
      if (!grouped[sale_date]) grouped[sale_date] = { date: sale_date };
      grouped[sale_date][menu_item_name] = metric;
    });
    return Object.values(grouped).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
  }, [filteredOverTime]);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 12 }}>
        📊 Menu Mix Insights
      </Text>
      <View style={{ marginBottom: 12 }}>
        <DateSelector
          label="Select Date Range"
          startDate={new Date(startDate)}
          endDate={new Date(endDate)}
          onStartDateChange={(d)=> setStartDate(fmt(d))}
          onEndDateChange={(d)=> setEndDate(fmt(d))}
          mode="range"
          direction="backward"
        />
      </View>
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <Toggle
          label="Revenue $"
          active={byRevenue}
          onPress={() => setByRevenue(true)}
        />
        <Toggle
          label="Quantity"
          active={!byRevenue}
          onPress={() => setByRevenue(false)}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
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
      {!loading && (
        <>
          {/* Breakdown with Pie chart and Treemap toggle placeholder */}
          <View style={{ backgroundColor: "white", padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 6 }}>
              <Text style={{ fontWeight: "700" }}>Breakdown ({byRevenue ? "Revenue" : "Qty"})</Text>
              <View style={{ flexDirection:'row' }}>
                <TouchableOpacity onPress={()=> setShowTreemap(false)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius: 16, backgroundColor: !showTreemap? '#2563eb':'#e5e7eb', marginRight: 8 }}>
                  <Text style={{ color: !showTreemap? 'white':'#111827', fontSize:12 }}>Pie</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> setShowTreemap(true)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius: 16, backgroundColor: showTreemap? '#2563eb':'#e5e7eb' }}>
                  <Text style={{ color: showTreemap? 'white':'#111827', fontSize:12 }}>Treemap</Text>
                </TouchableOpacity>
              </View>
            </View>
            {!showTreemap ? (
              filteredBreakdown.length === 0 ? (
                <Text style={{ fontSize: 12, color: "#555" }}>No data</Text>
              ) : (
                <Svg height={260} width="100%" viewBox="0 0 400 260">
                  <VictoryPie
                    standalone={false}
                    width={400}
                    height={260}
                    innerRadius={60}
                    animate={{ duration: 750, easing: "cubicInOut" }}
                    padAngle={1}
                    data={filteredBreakdown.map((b:any)=> ({ x: b.menu_item_name, y: Number(b.metric)||0 }))}
                    labels={({ datum }) => `${datum.x}`}
                    labelComponent={<VictoryLabel style={{ fontSize: 10 }} />}
                  />
                </Svg>
              )
            ) : (
              <Text style={{ fontSize: 12, color: "#555" }}>Treemap view coming soon (mobile-optimized)</Text>
            )}
          </View>
          {/* Sales Over Time - Line chart */}
          <View style={{ backgroundColor: "white", padding: 12, borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ fontWeight: "700", marginBottom: 6 }}>Sales Over Time</Text>
            {groupedOverTime.length === 0 ? (
              <Text style={{ fontSize: 12, color: "#555" }}>No data</Text>
            ) : (
              <Svg height={240} width="100%" viewBox="0 0 400 240">
                <VictoryChart standalone={false} width={400} height={240} theme={VictoryTheme.material}>
                  <VictoryAxis tickFormat={(t)=> String(t).slice(5)} style={{ tickLabels: { fontSize: 10 } }} />
                  <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
                  {Object.keys(groupedOverTime[0]).filter(k=> k!== 'date').slice(0, 3).map((key) => (
                    <VictoryLine key={key} data={groupedOverTime.map((r:any)=> ({ x: r.date, y: Number(r[key]||0) }))} animate={{ duration: 600 }} />
                  ))}
                </VictoryChart>
              </Svg>
            )}
          </View>

          {/* Top / Bottom with controls */}
          <View style={{ backgroundColor: "white", padding: 12, borderRadius: 12 }}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: "700" }}>Top / Bottom</Text>
              <View style={{ flexDirection:'row', alignItems:'center' }}>
                <TouchableOpacity onPress={()=> setTopView(true)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius: 16, backgroundColor: topView? '#2563eb':'#e5e7eb', marginRight: 8 }}>
                  <Text style={{ color: topView? 'white':'#111827', fontSize:12 }}>Top</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> setTopView(false)} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius: 16, backgroundColor: !topView? '#2563eb':'#e5e7eb', marginRight: 8 }}>
                  <Text style={{ color: !topView? 'white':'#111827', fontSize:12 }}>Bottom</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={()=> setTopCount(c=> Math.max(5, Math.min(25, c+5))) } style={{ paddingVertical:6, paddingHorizontal:10, borderRadius: 16, backgroundColor: '#e5e7eb' }}>
                  <Text style={{ fontSize:12 }}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>
            {filteredTopBottom.length === 0 ? (
              <Text style={{ fontSize: 12, color: "#555" }}>No data</Text>
            ) : (
              <Svg height={260} width="100%" viewBox="0 0 400 260">
                <VictoryChart standalone={false} width={400} height={260} domainPadding={{ x: 40, y: 20 }}>
                  <VictoryAxis tickFormat={(t)=> String(t).slice(0,8)} style={{ tickLabels: { fontSize: 9 } }} />
                  <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} />
                  <VictoryBar data={(topView ? filteredTopBottom.slice(0, topCount) : filteredTopBottom.slice(-topCount)).map((d:any)=> ({ x: d.menu_item_name, y: Number(d.metric)||0 }))} animate={{ duration: 650 }} style={{ data: { fill: '#2563eb' } }} />
                </VictoryChart>
              </Svg>
            )}
          </View>
        </>
      )}
    </ScrollView>
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
