import React, { useState, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';

interface IngredientCost { id: number; name: string; category: string; supplier: string; weeklyCosts: number[] }
const fakeIngredientCosts: IngredientCost[] = [
  { id:1, name:'Tomatoes', category:'Vegetables', supplier:'Supplier A', weeklyCosts:[1.2,1.3,1.35,1.4,1.38,1.45,1.5,1.55,1.52,1.6,1.58,1.65] },
  { id:2, name:'Chicken Breast', category:'Meat', supplier:'Supplier B', weeklyCosts:[3.5,3.55,3.6,3.55,3.7,3.75,3.8,3.85,3.9,3.95,4.0,4.05] },
  { id:3, name:'Mozzarella Cheese', category:'Dairy', supplier:'Supplier C', weeklyCosts:[2.1,2.05,2.0,1.95,2.0,2.05,2.1,2.15,2.2,2.25,2.3,2.35] },
  { id:4, name:'Basil', category:'Herbs', supplier:'Supplier D', weeklyCosts:[0.8,0.82,0.83,0.85,0.9,0.95,1.0,1.05,1.1,1.15,1.2,1.25] },
];
const percentChange = (arr:number[]) => arr.length<2?0: ((arr[arr.length-1]-arr[0])/arr[0])*100;
const categories = Array.from(new Set(fakeIngredientCosts.map(i=>i.category)));
const suppliers = Array.from(new Set(fakeIngredientCosts.map(i=>i.supplier)));

export default function IngredientTrends() {
  const [category, setCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [selectedId, setSelectedId] = useState<number|null>(null);
  const filtered = useMemo(()=> fakeIngredientCosts.filter(i => (!category || i.category===category) && (!supplier || i.supplier===supplier)), [category, supplier]);
  const selected = filtered.find(i=>i.id===selectedId) || null;
  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Ingredient Cost Trends</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
        <View style={{ flexDirection:'row' }}>
          <Chip label="All Categories" active={category===''} onPress={()=>setCategory('')} />
          {categories.map(c=> <Chip key={c} label={c} active={category===c} onPress={()=>setCategory(c)} />)}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
        <View style={{ flexDirection:'row' }}>
          <Chip label="All Suppliers" active={supplier===''} onPress={()=>setSupplier('')} />
          {suppliers.map(s=> <Chip key={s} label={s} active={supplier===s} onPress={()=>setSupplier(s)} />)}
        </View>
      </ScrollView>
      {filtered.map(i=> {
        const change = percentChange(i.weeklyCosts);
        const active = i.id===selectedId;
        return (
          <TouchableOpacity key={i.id} onPress={()=>setSelectedId(i.id)} style={{ padding:12, borderWidth:1, borderColor: active? '#2563eb':'#ddd', borderRadius:8, marginBottom:8 }}>
            <Text style={{ fontWeight:'600' }}>{i.name}</Text>
            <Text style={{ fontSize:12, color:'#555' }}>{i.category} • {i.supplier}</Text>
            <Text style={{ marginTop:4, color: change>10? '#dc2626': change<-10? '#16a34a':'#111' }}>Change 12w: {change.toFixed(1)}%</Text>
          </TouchableOpacity>
        );
      })}
      {selected && (
        <View style={{ marginTop:16, padding:12, borderWidth:1, borderColor:'#2563eb', borderRadius:8 }}>
          <Text style={{ fontWeight:'600', marginBottom:4 }}>{selected.name} Trend (last 12 weeks)</Text>
          <Text style={{ fontSize:12, color:'#555' }}>Weekly: {selected.weeklyCosts.map(v=>`$${v.toFixed(2)}`).join(', ')}</Text>
          <Text style={{ marginTop:8, fontSize:12, fontStyle:'italic' }}>* Chart placeholder (add RN chart lib)</Text>
        </View>
      )}
    </ScrollView>
  );
}

function Chip({ label, active, onPress}:{ label:string; active:boolean; onPress:()=>void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal:10, paddingVertical:6, backgroundColor: active? '#2563eb':'#e5e7eb', borderRadius:16, marginRight:8 }}>
      <Text style={{ color: active? 'white':'#111' }}>{label}</Text>
    </TouchableOpacity>
  );
}
