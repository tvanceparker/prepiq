import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useForecastAccuracy } from '../hooks/useForecastAccuracy';

function formatDate(d:Date){ return d.toISOString().split('T')[0]; }
function daysAgo(n:number){ const d=new Date(); d.setDate(d.getDate()-n); return d; }

export default function ForecastAccuracyBasicMobile(){
  const [startDate,setStartDate] = useState(formatDate(daysAgo(7)));
  const [endDate,setEndDate] = useState(formatDate(new Date()));
  const { filteredChartData, filteredTableData, chartData, tableData, computedData, selectedMenuItemIds, setSelectedMenuItemIds, loading, error } = useForecastAccuracy(startDate,endDate);

  const allMenuItems = useMemo(()=> { const combined = [...chartData, ...tableData, ...computedData]; return Array.from(new Map(combined.map(({ menu_item_id, menu_item_name })=> [menu_item_id, menu_item_name]))); },[chartData,tableData,computedData]);
  useEffect(()=> { if(!selectedMenuItemIds.length && allMenuItems.length) setSelectedMenuItemIds(allMenuItems.map(([id])=> id)); },[allMenuItems, selectedMenuItemIds]);

  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Forecast Accuracy</Text>
      {/* Date info */}
      <Text style={{ fontSize:12, color:'#555', marginBottom:8 }}>Range: {startDate} → {endDate}</Text>
      {/* Menu item filter pills */}
      <ScrollView horizontal style={{ marginBottom:12 }} showsHorizontalScrollIndicator={false}>
        {allMenuItems.map(([id,name])=> (
          <TouchableOpacity key={id} onPress={()=> setSelectedMenuItemIds(prev=> prev.includes(id as number)? prev.filter(x=> x!==id): [...prev, id as number])} style={{ backgroundColor: selectedMenuItemIds.includes(id as number)? '#2563eb':'#e5e7eb', paddingVertical:6, paddingHorizontal:10, borderRadius:20, marginRight:8 }}>
            <Text style={{ fontSize:12, color: selectedMenuItemIds.includes(id as number)? 'white':'#111827' }}>{name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color:'#dc2626' }}>{error}</Text>}
      {!loading && !error && (
        <>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'600', marginBottom:8 }}>Accuracy Table</Text>
            {filteredTableData.slice(0,50).map((row:any,i:number)=> (
              <View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                <Text style={{ flex:1 }}>{row.menu_item_name}</Text>
                <Text style={{ width:60, textAlign:'right' }}>{(row.accuracy_percent ?? row.accuracy || 0).toFixed?.(1) || row.accuracy_percent}</Text>
              </View>
            ))}
            {filteredTableData.length===0 && <Text style={{ fontSize:12, color:'#555' }}>No rows.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}
