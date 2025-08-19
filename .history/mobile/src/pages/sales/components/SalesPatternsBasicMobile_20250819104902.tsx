import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSalesPatterns } from '../hooks/useSalesPatterns';

export default function SalesPatternsBasicMobile(){
  const { startDate,endDate,setStartDate,setEndDate,byRevenue,setByRevenue,normalize,setNormalize,salesOverTime,heatmapData,weekdayAvg,channelBreakdown,loading,error } = useSalesPatterns();
  const [layoutMode,setLayoutMode] = useState<'grid'|'single'>('grid');
  const charts = [
    { title:'Sales Over Time by Item', component: <MiniList data={salesOverTime} primaryKey='menu_item_name' valueKey='metric' /> },
    { title:'Sales Heatmap', component: <MiniList data={Array.isArray(heatmapData)? heatmapData: []} primaryKey='menu_item_name' valueKey='metric' /> },
    { title:'Average Sales by Weekday', component: <MiniList data={weekdayAvg} primaryKey='weekday' valueKey='metric' /> },
    { title:'Sales Channel Breakdown', component: <MiniList data={channelBreakdown} primaryKey='sales_channel' valueKey='metric' /> },
  ];
  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Sales Patterns</Text>
      <View style={{ flexDirection:'row', marginBottom:12 }}>
        <Toggle label={byRevenue? 'Viewing: Revenue':'Viewing: Count'} active onPress={()=> setByRevenue(!byRevenue)} />
        <Toggle label={normalize? 'Normalize On':'Normalize Off'} active={normalize} onPress={()=> setNormalize(!normalize)} />
        <Toggle label={layoutMode==='grid'? 'Grid':'Single'} active onPress={()=> setLayoutMode(layoutMode==='grid'? 'single':'grid')} />
      </View>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color:'#dc2626' }}>Error loading data</Text>}
      {!loading && !error && (
        <View style={{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' }}>
          {charts.map(c=> (
            <View key={c.title} style={{ width: layoutMode==='grid'? '48%':'100%', backgroundColor:'white', padding:12, borderRadius:12, marginBottom:12 }}>
              <Text style={{ fontWeight:'600', marginBottom:6 }}>{c.title}</Text>
              {c.component}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MiniList({ data, primaryKey, valueKey }:{ data:any[]; primaryKey:string; valueKey:string }) {
  if(!data || data.length===0) return <Text style={{ fontSize:12, color:'#555' }}>No data</Text>;
  return (
    <View>
      {data.slice(0,15).map((row:any,i:number)=> (
        <View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
          <Text numberOfLines={1} style={{ flex:1, marginRight:8 }}>{row[primaryKey]}</Text>
          <Text style={{ width:60, textAlign:'right' }}>{row[valueKey]}</Text>
        </View>
      ))}
    </View>
  );
}

function Toggle({ label, active, onPress }:{ label:string; active:boolean; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: active? '#2563eb':'#e5e7eb', paddingVertical:8, paddingHorizontal:14, borderRadius:20, marginRight:8, marginBottom:8 }}>
      <Text style={{ color: active? 'white':'#111827', fontSize:12 }}>{label}</Text>
    </TouchableOpacity>
  );
}
