import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useUpcomingForecast } from '../hooks/useUpcomingForecast';

function formatDate(date: Date | string){
  if(typeof date === 'string'){ const [y,m,d] = date.split('-'); return new Date(Number(y), Number(m)-1, Number(d)).toLocaleDateString(); }
  return date.toLocaleDateString();
}

export default function UpcomingForecastBasicMobile(){
  const today = new Date();
  const end = new Date(); end.setDate(end.getDate()+2);
  const { startDate,setStartDate,endDate,setEndDate,mode,setMode,forecastTable,forecastTotals,topItems,loading,error } = useUpcomingForecast(today,end);
  const dayRange = Math.max(1, Math.round((endDate.getTime()-startDate.getTime())/(1000*60*60*24))+1);
  const totalsPerDay = mode==='per_day';
  const totalItemsSummary = useMemo(()=>{ if(mode!=='total') return null; const sums:Record<string,number>={}; forecastTable.forEach(r=>{ if(!r.menu_item_name) return; sums[r.menu_item_name]=(sums[r.menu_item_name]||0)+r.forecasted_quantity;}); return Object.entries(sums).map(([name,quantity])=>({name,quantity})); },[forecastTable,mode]);
  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Forecast (Next {dayRange} Day{dayRange>1?'s':''})</Text>
      <View style={{ flexDirection:'row', marginBottom:12 }}>
        <Toggle label='Per Day' active={totalsPerDay} onPress={()=> setMode('per_day')} />
        <Toggle label='Full Range' active={!totalsPerDay} onPress={()=> setMode('total')} />
      </View>
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color:'#dc2626' }}>Failed to load forecast</Text>}
      {!loading && !error && (
        <>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'600', marginBottom:8 }}>Totals</Text>
            {mode==='per_day'? (Array.isArray(forecastTotals) ? forecastTotals.map((t:any)=> (
              <View key={t.date} style={{ marginBottom:6 }}>
                <Text style={{ fontWeight:'600' }}>{formatDate(t.date)}: {t.forecasted_quantity} items - ${Number(t.forecasted_revenue||0).toFixed(2)}</Text>
                {forecastTable.filter(r=> r.date===t.date).map((r:any)=>(<Text key={r.menu_item_name} style={{ fontSize:12, color:'#555' }}>• {r.menu_item_name}: {r.forecasted_quantity}</Text>))}
              </View>)) : <Text>No totals.</Text>) : (
              <>
                <Text style={{ fontWeight:'600' }}>Total Items: {forecastTotals?.forecasted_quantity ?? 0}</Text>
                <Text style={{ fontWeight:'600' }}>Total Revenue: ${(forecastTotals?.forecasted_revenue || 0).toFixed(2)}</Text>
                {totalItemsSummary?.map(i=> (<Text key={i.name} style={{ fontSize:12, color:'#555' }}>• {i.name}: {i.quantity}</Text>))}
              </>) }
          </View>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
            <Text style={{ fontWeight:'600', marginBottom:8 }}>Top Items</Text>
            {topItems.length===0 && <Text style={{ fontSize:12, color:'#555' }}>No data</Text>}
            {topItems.map((ti:any)=> (<View key={ti.name} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}><Text>{ti.name}</Text><Text>{ti.forecasted_quantity}</Text></View>))}
          </View>
          <View style={{ backgroundColor:'white', padding:12, borderRadius:12 }}>
            <Text style={{ fontWeight:'600', marginBottom:8 }}>Forecast Table ({mode==='per_day'? 'Per Day':'Total'})</Text>
            {forecastTable.slice(0,100).map((r:any,i:number)=> (<View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
              <Text style={{ flex:1 }}>{r.menu_item_name}</Text>
              {mode==='per_day' && <Text style={{ width:80 }}>{formatDate(r.date)}</Text>}
              <Text style={{ width:60, textAlign:'right' }}>{r.forecasted_quantity}</Text>
            </View>))}
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
