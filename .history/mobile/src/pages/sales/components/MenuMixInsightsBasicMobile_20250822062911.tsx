import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import useMenuMixInsights from '../hooks/useMenuMixInsights';

function daysAgo(n:number){ const d=new Date(); d.setDate(d.getDate()-n); return d; }
function fmt(d:Date){ return d.toISOString().slice(0,10); }

export default function MenuMixInsightsBasicMobile(){
  const defaultEnd = daysAgo(0); const defaultStart = daysAgo(7);
  const [startDate,setStartDate] = useState(fmt(defaultStart));a
  const [endDate,setEndDate] = useState(fmt(defaultEnd));
  const [byRevenue,setByRevenue] = useState(true);
  const { breakdownData, overTimeData, topBottomData, selectedMenuItemIds, setSelectedMenuItemIds, loading } = useMenuMixInsights(startDate,endDate,byRevenue);
  const allMenuItems = useMemo(()=> { const combined = [...breakdownData, ...overTimeData, ...topBottomData]; return Array.from(new Map(combined.map(({ menu_item_id, menu_item_name })=> [menu_item_id, menu_item_name]))); },[breakdownData,overTimeData,topBottomData]);
  useEffect(()=> { if(allMenuItems.length>0 && selectedMenuItemIds.length===0) setSelectedMenuItemIds(allMenuItems.map(([id])=> id)); },[allMenuItems, selectedMenuItemIds]);

  const filteredBreakdown = selectedMenuItemIds.length===0? breakdownData: breakdownData.filter(item=> selectedMenuItemIds.includes(item.menu_item_id));
  const filteredOverTime = selectedMenuItemIds.length===0? overTimeData: overTimeData.filter(item=> selectedMenuItemIds.includes(item.menu_item_id));
  const filteredTopBottom = selectedMenuItemIds.length===0? topBottomData: topBottomData.filter(item=> selectedMenuItemIds.includes(item.menu_item_id));

  const groupedOverTime = useMemo(()=> { const grouped:Record<string, any> = {}; filteredOverTime.forEach(({ sale_date, menu_item_name, metric })=> { if(!sale_date||!menu_item_name) return; if(!grouped[sale_date]) grouped[sale_date]={ date:sale_date }; grouped[sale_date][menu_item_name]=metric; }); return Object.values(grouped).sort((a:any,b:any)=> a.date.localeCompare(b.date)); },[filteredOverTime]);

  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Menu Mix Insights</Text>
      <Text style={{ fontSize:12, color:'#555', marginBottom:8 }}>{startDate} → {endDate}</Text>
      <View style={{ flexDirection:'row', marginBottom:12 }}>
        <Toggle label='Revenue $' active={byRevenue} onPress={()=> setByRevenue(true)} />
        <Toggle label='Quantity' active={!byRevenue} onPress={()=> setByRevenue(false)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
        {allMenuItems.map(([id,name])=> (
          <TouchableOpacity key={id} onPress={()=> setSelectedMenuItemIds(prev=> prev.includes(id as number)? prev.filter(x=> x!==id): [...prev, id as number])} style={{ backgroundColor: selectedMenuItemIds.includes(id as number)? '#2563eb':'#e5e7eb', paddingVertical:6, paddingHorizontal:10, borderRadius:20, marginRight:8 }}>
            <Text style={{ fontSize:12, color: selectedMenuItemIds.includes(id as number)? 'white':'#111827' }}>{name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && <ActivityIndicator />}
      {!loading && (
        <>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'600', marginBottom:6 }}>Breakdown ({byRevenue? 'Revenue':'Qty'})</Text>
            {filteredBreakdown.slice(0,25).map((b:any,i:number)=> (<View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}><Text>{b.menu_item_name}</Text><Text>{byRevenue? `$${b.metric?.toFixed?.(2)}`: b.metric}</Text></View>))}
            {filteredBreakdown.length===0 && <Text style={{ fontSize:12, color:'#555' }}>No data</Text>}
          </View>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'600', marginBottom:6 }}>Top / Bottom</Text>
            {filteredTopBottom.slice(0,25).map((b:any,i:number)=> (<View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}><Text numberOfLines={1} style={{ flex:1, marginRight:6 }}>{b.menu_item_name}</Text><Text>{byRevenue? `$${b.metric?.toFixed?.(2)}`: b.metric}</Text></View>))}
            {filteredTopBottom.length===0 && <Text style={{ fontSize:12, color:'#555' }}>No data</Text>}
          </View>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12 }}>
            <Text style={{ fontWeight:'600', marginBottom:6 }}>Over Time</Text>
            {groupedOverTime.slice(0,50).map((row:any,i:number)=> (<View key={i} style={{ marginBottom:4 }}><Text style={{ fontWeight:'600' }}>{row.date}</Text></View>))}
            {groupedOverTime.length===0 && <Text style={{ fontSize:12, color:'#555' }}>No data</Text>}
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
