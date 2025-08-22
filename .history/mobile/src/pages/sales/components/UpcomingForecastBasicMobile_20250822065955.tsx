import React, { useMemo, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated, Easing } from 'react-native';
import { useUpcomingForecast } from '../hooks/useUpcomingForecast';
import DateSelector from '../../../components/DateSelector';
import { Chip } from 'react-native-paper';
import Svg from 'react-native-svg';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { useForecastAccuracy } from '../hooks/useForecastAccuracy';

function formatDate(date: Date | string){
  if(typeof date === 'string'){ const [y,m,d] = date.split('-'); return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString(); }
  return date.toLocaleDateString();
}

function isoDate(d: Date){
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

const COLORS = ['#2563eb', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#a78bfa', '#60a5fa', '#84cc16', '#fb7185', '#34d399'];
function generateHueColor(i: number){ const h = (i * 137.508) % 360; return `hsl(${Math.round(h)}, 70%, 45%)`; }

export default function UpcomingForecastBasicMobile(){
  const today = new Date();
  const end = new Date(); end.setDate(end.getDate()+2);
  const { startDate,setStartDate,endDate,setEndDate,mode,setMode,forecastTable,forecastTotals,topItems,loading,error } = useUpcomingForecast(today,end);
  const dayRange = Math.max(1, Math.round((endDate.getTime()-startDate.getTime())/(1000*60*60*24))+1);
  const totalsPerDay = mode==='per_day';
  const totalItemsSummary = useMemo(()=>{ if(mode!=='total') return null; const sums:Record<string,number>={}; forecastTable.forEach(r=>{ if(!r.menu_item_name) return; sums[r.menu_item_name]=(sums[r.menu_item_name]||0)+r.forecasted_quantity;}); return Object.entries(sums).map(([name,quantity])=>({name,quantity})); },[forecastTable,mode]);
  // Build a unique list of menu items for filtering (per-day mode) as [id, name]
  const uniqueMenuItems = useMemo(() => {
    const map = new Map<number, string>();
    forecastTable.forEach((r:any) => { if (r?.menu_item_id) map.set(Number(r.menu_item_id), String(r.menu_item_name)); });
    return Array.from(map.entries()); // [[id, name], ...]
  }, [forecastTable]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  useEffect(()=>{ /* reset selection if data changes drastically */ setSelectedItems([]); }, [startDate, endDate]);

  // Forecast Accuracy hook (daily accuracy chart)
  const { filteredChartData: accuracyChartPoints, filteredTableData: accuracyTableRows, setSelectedMenuItemIds: setAccuracySelectedIds, selectedMenuItemIds: accuracySelectedIds, loading: accuracyLoading, error: accuracyError } = useForecastAccuracy(isoDate(startDate), isoDate(endDate));

  // Build color map for accuracy chart per menu item name
  const accuracyColorMap = useMemo(() => {
    const map: Record<string,string> = {};
    uniqueMenuItems.forEach(([id, name], idx) => {
      map[name] = COLORS[idx % COLORS.length] || generateHueColor(idx);
    });
    return map;
  }, [uniqueMenuItems]);

  // Group accuracy points by date like groupedOverTime: [{ date: 'YYYY-MM-DD', [menu_name]: error_percentage }]
  const groupedAccuracyOverTime = useMemo(() => {
    const grouped: Record<string, any> = {};
    accuracyChartPoints.forEach((p:any) => {
      const dateStr = typeof p.date === 'string' ? p.date : (p.date?.toString?.() || '');
      if (!dateStr) return;
      if (!grouped[dateStr]) grouped[dateStr] = { date: dateStr };
      grouped[dateStr][p.menu_item_name] = Number(p.error_percentage || 0);
    });
    return Object.values(grouped).sort((a:any,b:any)=> a.date.localeCompare(b.date));
  }, [accuracyChartPoints]);

  // Compute simple average error per menu item for the summary
  const accuracySummary = useMemo(() => {
    const sums: Record<string, { total:number, count:number }> = {};
    accuracyChartPoints.forEach((p:any)=>{
      const name = p.menu_item_name || 'Unknown';
      if (!sums[name]) sums[name] = { total: 0, count: 0 };
      sums[name].total += Number(p.error_percentage || 0);
      sums[name].count += 1;
    });
    return Object.keys(sums).map(name => ({ menu_item_name: name, avg_error: sums[name].total / Math.max(1, sums[name].count) })).sort((a,b)=> b.avg_error - a.avg_error);
  }, [accuracyChartPoints]);
  return (
    <ScrollView contentContainerStyle={{ padding:16, paddingBottom: 32 }}>
      <Text style={{ fontSize:22, fontWeight:'700', marginBottom:12 }}>🔮 Forecast (Next {dayRange} Day{dayRange>1?'s':''})</Text>

      {/* Date selector (forward presets, default showing next 3 days) */}
      <View style={{ marginBottom: 12 }}>
        <DateSelector
          label="Forecast Date Range"
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          mode="range"
          direction="forward"
        />
      </View>

      <View style={{ flexDirection:'row', marginBottom:12 }}>
        <Toggle label='Per Day' active={totalsPerDay} onPress={()=> setMode('per_day')} />
        <Toggle label='Full Range' active={!totalsPerDay} onPress={()=> setMode('total')} />
      </View>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color:'#dc2626' }}>Failed to load forecast</Text>}
      {!loading && !error && (
        <>
          {/* Totals card with its own scroll area */}
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'700', marginBottom:8 }}>Totals</Text>
            {mode==='per_day' ? (
              <ScrollView
                style={{ maxHeight: 240 }}
                nestedScrollEnabled
                scrollEnabled
                showsVerticalScrollIndicator
                contentContainerStyle={{ paddingBottom: 4 }}
              >
                {Array.isArray(forecastTotals) ? (
                  forecastTotals.map((t:any)=> (
                    <View key={t.date} style={{ marginBottom:8 }}>
                      <Text style={{ fontWeight:'600' }}>{formatDate(t.date)}: {t.forecasted_quantity} items - ${Number(t.forecasted_revenue||0).toFixed(2)}</Text>
                      {forecastTable.filter(r=> r.date===t.date).map((r:any)=>(
                        <Text key={r.menu_item_name} style={{ fontSize:12, color:'#555' }}>• {r.menu_item_name}: {r.forecasted_quantity}</Text>
                      ))}
                    </View>
                  ))
                ) : (
                  <Text>No totals.</Text>
                )}
              </ScrollView>
            ) : (
              <>
                <Text style={{ fontWeight:'600' }}>Total Items: {forecastTotals?.forecasted_quantity ?? 0}</Text>
                <Text style={{ fontWeight:'600' }}>Total Revenue: ${(forecastTotals?.forecasted_revenue || 0).toFixed(2)}</Text>
                <ScrollView
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                  scrollEnabled
                  showsVerticalScrollIndicator
                  contentContainerStyle={{ paddingBottom: 4 }}
                >
                  {totalItemsSummary?.map(i=> (
                    <Text key={i.name} style={{ fontSize:12, color:'#555' }}>• {i.name}: {i.quantity}</Text>
                  ))}
                </ScrollView>
              </>
            )}
          </View>

          {/* Animated Top Items Bar Chart */}
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'700', marginBottom:8 }}>Top Items</Text>
            {topItems.length===0 ? (
              <Text style={{ fontSize:12, color:'#555' }}>No data</Text>
            ) : (
              <AnimatedBarChart data={topItems.slice(0,5)} valueKey="forecasted_quantity" labelKey="name" />
            )}
          </View>

          <View style={{ backgroundColor:'white', padding:12, borderRadius:12 }}>
            <Text style={{ fontWeight:'600', marginBottom:8 }}>Forecast Table ({mode==='per_day'? 'Per Day':'Total'})</Text>
            {mode==='per_day' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <Chip
                  selected={selectedItems.length===0}
                  onPress={()=> { setSelectedItems([]); setAccuracySelectedIds([]); }}
                  style={{ marginRight: 8 }}
                >All Items</Chip>
                {uniqueMenuItems.map(([id,name]) => (
                  <Chip
                    key={String(id)}
                    selected={selectedItems.includes(Number(id))}
                    onPress={()=> {
                      setSelectedItems(prev => prev.includes(Number(id)) ? prev.filter(n => n!==Number(id)) : [...prev, Number(id)]);
                      // also apply to accuracy hook (IDs expected)
                      setAccuracySelectedIds(prev => prev.includes(Number(id)) ? prev.filter(x => x!==Number(id)) : [...prev, Number(id)]);
                    }}
                    style={{ marginRight: 8 }}
                  >{name}</Chip>
                ))}
              </ScrollView>
            )}
            {(forecastTable
              .filter((r:any) => mode!=='per_day' || selectedItems.length===0 || selectedItems.includes(Number(r.menu_item_id)))
              .slice(0,100)
            ).map((r:any,i:number)=> (<View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
              <Text style={{ flex:1 }}>{r.menu_item_name}</Text>
              {mode==='per_day' && <Text style={{ width:80 }}>{formatDate(r.date)}</Text>}
              <Text style={{ width:60, textAlign:'right' }}>{r.forecasted_quantity}</Text>
            </View>))}
          </View>
          {/* Forecast Accuracy Line Chart */}
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginTop:12 }}>
            <Text style={{ fontWeight:'700', marginBottom:8 }}>Forecast Accuracy (Error %)</Text>
            {accuracyLoading ? <ActivityIndicator /> : (groupedAccuracyOverTime.length === 0 ? (
              <Text style={{ fontSize:12, color:'#555' }}>No accuracy data</Text>
            ) : (
              <>
                <Svg height={240} width="100%" viewBox="0 0 400 240">
                  <VictoryChart standalone={false} width={400} height={240} theme={VictoryTheme.material}>
                    <VictoryAxis tickFormat={(t)=> String(t).slice(5)} style={{ tickLabels: { fontSize: 10 } }} />
                    <VictoryAxis dependentAxis tickFormat={(v)=> `${Number(v).toFixed(1)}%`} style={{ tickLabels: { fontSize: 10 } }} />
                    {Object.keys(groupedAccuracyOverTime[0]).filter(k=> k!=='date').map((key, idx) => (
                      <VictoryLine key={key} data={groupedAccuracyOverTime.map((r:any)=> ({ x: r.date, y: Number(r[key]||0) }))} style={{ data: { stroke: accuracyColorMap[key] || generateHueColor(idx) } }} />
                    ))}
                  </VictoryChart>
                </Svg>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:8 }}>
                  {Object.keys(groupedAccuracyOverTime[0]).filter(k=> k!=='date').map((key, i)=> (
                    <View key={key} style={{ flexDirection:'row', alignItems:'center', marginRight:12 }}>
                      <View style={{ width:12, height:12, backgroundColor: accuracyColorMap[key] || generateHueColor(i), borderRadius:3, marginRight:6 }} />
                      <Text style={{ fontSize:12 }}>{key}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Accuracy summary */}
                <View style={{ marginTop: 10 }}>
                  {accuracySummary.slice(0,8).map(s => (
                    <View key={s.menu_item_name} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
                      <Text style={{ flex:1 }}>{s.menu_item_name}</Text>
                      <Text style={{ fontWeight:'600' }}>{`${s.avg_error.toFixed(1)}%`}</Text>
                    </View>
                  ))}
                </View>
              </>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Toggle({ label, active, onPress }:{ label:string; active:boolean; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: active? '#2563eb':'#e5e7eb', paddingVertical:8, paddingHorizontal:14, borderRadius:20, marginRight:8 }}>
      <Text style={{ color: active? 'white':'#111827', fontSize:12 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function AnimatedBarChart({ data, valueKey, labelKey }:{ data:any[]; valueKey:string; labelKey:string }){
  const [containerWidth, setContainerWidth] = useState(0);
  const max = Math.max(1, ...data.map(d => Number(d[valueKey]||0)));
  return (
    <View onLayout={(e)=> setContainerWidth(e.nativeEvent.layout.width)}>
      {data.map((d, idx) => (
        <BarRow
          key={String(d[labelKey])}
          label={String(d[labelKey])}
          value={Number(d[valueKey]||0)}
          max={max}
          containerWidth={containerWidth}
          delay={idx*80}
        />
      ))}
    </View>
  );
}

function BarRow({ label, value, max, containerWidth, delay=0 }:{ label:string; value:number; max:number; containerWidth:number; delay?:number }){
  const animated = useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    animated.setValue(0);
    Animated.timing(animated, { toValue: value/max, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false, delay }).start();
  }, [value, max, delay]);
  const barWidth = animated.interpolate({ inputRange: [0,1], outputRange: [0, Math.max(0, containerWidth - 100)] });
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <Text style={{ flex: 1, marginRight: 8 }}>{label}</Text>
        <Text style={{ width: 80, textAlign:'right', fontVariant: ['tabular-nums'] }}>{value}</Text>
      </View>
      <View style={{ height: 10, backgroundColor:'#e5e7eb', borderRadius: 6, overflow:'hidden' }}>
        <Animated.View style={{ height: '100%', width: barWidth, backgroundColor: '#2563eb' }} />
      </View>
    </View>
  );
}
