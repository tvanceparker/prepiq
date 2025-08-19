import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text } from 'react-native';

interface Insight { id:number; type:string; message:string; action:string; severity:'critical'|'warning'|'success'|'info'; timestamp:string }
const insights: Insight[] = [
  { id:1, type:'Waste', message:'Tomatoes waste up 20% last week.', action:'Review prep schedule.', severity:'warning', timestamp:'2025-06-01T09:00:00Z' },
  { id:2, type:'Profit', message:'Chicken Breast margin 45%.', action:'Promote dish.', severity:'success', timestamp:'2025-06-02T14:20:00Z' },
  { id:3, type:'Inventory', message:'Basil below reorder point.', action:'Create PO.', severity:'critical', timestamp:'2025-06-03T08:15:00Z' },
  { id:4, type:'Forecast', message:'Dairy forecast accuracy dropped 15%.', action:'Review model.', severity:'warning', timestamp:'2025-06-02T18:30:00Z' },
  { id:5, type:'Profit', message:'Mozzarella cost up 12%.', action:'Negotiate pricing.', severity:'warning', timestamp:'2025-05-31T12:45:00Z' },
];
const types = ['All','Waste','Profit','Inventory','Forecast'];
const severityColors: Record<string,string> = { critical:'#fecaca', warning:'#fef3c7', success:'#dcfce7', info:'#bfdbfe' };

export default function InsightsOptimization() {
  const [filter,setFilter] = useState('All');
  const [dismissed,setDismissed] = useState<Set<number>>(new Set());
  const visible = useMemo(()=> insights.filter(i => (filter==='All'|| i.type===filter) && !dismissed.has(i.id)), [filter,dismissed]);
  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Insights & Optimization</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
        <View style={{ flexDirection:'row' }}>
          {types.map(t => <Chip key={t} label={t} active={filter===t} onPress={()=>setFilter(t)} />)}
        </View>
      </ScrollView>
      {visible.length===0 && <Text style={{ textAlign:'center', color:'#666' }}>No insights.</Text>}
      {visible.map(ins => (
        <View key={ins.id} style={{ borderLeftWidth:4, borderLeftColor:'#2563eb', backgroundColor:severityColors[ins.severity], padding:12, borderRadius:8, marginBottom:10 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text style={{ fontWeight:'600' }}>{ins.type} Insight</Text>
            <Text onPress={()=> setDismissed(prev => new Set(prev).add(ins.id))} style={{ color:'#555' }}>×</Text>
          </View>
          <Text style={{ marginTop:4 }}>{ins.message}</Text>
          <Text style={{ fontStyle:'italic', fontSize:12, marginTop:4 }}>Action: {ins.action}</Text>
          <Text style={{ fontSize:10, color:'#555', marginTop:4 }}>{new Date(ins.timestamp).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress}:{ label:string; active:boolean; onPress:()=>void }) {
  return (
    <Text onPress={onPress} style={{ paddingHorizontal:12, paddingVertical:6, backgroundColor: active? '#2563eb':'#e5e7eb', color: active? 'white':'#111', borderRadius:16, marginRight:8 }}>{label}</Text>
  );
}
