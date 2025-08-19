import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSalesExplorer } from '../hooks/useSalesExplorer';

export default function SalesExplorerBasicMobile(){
  const { data, menuItems, salesChannels, loading, error, filters:{ startDate,setStartDate,endDate,setEndDate }, createSaleRecord } = useSalesExplorer();
  const [openForm,setOpenForm] = useState(false);
  const [form,setForm] = useState({ menu_item_id:null as any, sale_timestamp:new Date().toISOString().slice(0,16), quantity_sold:1, sales_channel:'', revenue:0 });

  useEffect(()=> { if(!startDate && !endDate){ const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate()-1); const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(today.getMonth()-1); setStartDate(threeMonthsAgo.toISOString().split('T')[0]); setEndDate(yesterday.toISOString().split('T')[0]); } },[startDate,endDate]);

  const submit = async () => { if(!form.menu_item_id||!form.sale_timestamp||!form.quantity_sold||!form.sales_channel){ Alert.alert('Validation','Fill all fields'); return; } try { await createSaleRecord({ menu_item_id: form.menu_item_id, sale_timestamp: new Date(form.sale_timestamp).toISOString(), quantity_sold: Number(form.quantity_sold), sales_channel: form.sales_channel, revenue: Number(form.revenue) }); setOpenForm(false); setForm({ menu_item_id:null, sale_timestamp:new Date().toISOString().slice(0,16), quantity_sold:1, sales_channel:'', revenue:0 }); } catch(e:any){ Alert.alert('Error', e.message||'Failed to create sale'); } };

  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Sales Explorer</Text>
      <Text style={{ fontSize:12, color:'#555', marginBottom:8 }}>Range: {startDate} → {endDate}</Text>
      <View style={{ flexDirection:'row', marginBottom:12 }}>
        <TouchableOpacity onPress={()=> setOpenForm(o=> !o)} style={{ backgroundColor:'#2563eb', padding:10, borderRadius:8, marginRight:8 }}><Text style={{ color:'white', fontWeight:'600' }}>{openForm? 'Close':'Create Sale'}</Text></TouchableOpacity>
      </View>
      {openForm && (
        <View style={{ backgroundColor:'white', padding:12, borderRadius:12, marginBottom:16 }}>
          <Text style={{ fontWeight:'600', marginBottom:8 }}>New Sale</Text>
          <TextInput placeholder='Menu Item ID' value={form.menu_item_id? String(form.menu_item_id):''} onChangeText={t=> setForm(f=> ({ ...f, menu_item_id: Number(t)||null }))} style={ti} />
          <TextInput placeholder='Timestamp' value={form.sale_timestamp} onChangeText={t=> setForm(f=> ({ ...f, sale_timestamp:t }))} style={ti} />
            <TextInput placeholder='Quantity' value={String(form.quantity_sold)} onChangeText={t=> setForm(f=> ({ ...f, quantity_sold: Number(t)||0 }))} style={ti} keyboardType='numeric' />
          <TextInput placeholder='Sales Channel' value={form.sales_channel} onChangeText={t=> setForm(f=> ({ ...f, sales_channel:t }))} style={ti} />
          <TextInput placeholder='Revenue' value={String(form.revenue)} onChangeText={t=> setForm(f=> ({ ...f, revenue: Number(t)||0 }))} style={ti} keyboardType='numeric' />
          <TouchableOpacity onPress={submit} style={{ backgroundColor:'#16a34a', padding:10, borderRadius:8, alignItems:'center' }}><Text style={{ color:'white', fontWeight:'600' }}>Save</Text></TouchableOpacity>
        </View>
      )}
      {loading && <ActivityIndicator />}
      {error && <Text style={{ color:'#dc2626' }}>{error}</Text>}
      {!loading && !error && (
        <View style={{ backgroundColor:'white', padding:12, borderRadius:12 }}>
          <Text style={{ fontWeight:'600', marginBottom:8 }}>Sales ({data.length})</Text>
          {data.slice(0,200).map((row:any,i:number)=> (
            <View key={i} style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
              <Text style={{ flex:1 }}>{row.menu_item_name || row.menu_item_id}</Text>
              <Text style={{ width:70, textAlign:'right' }}>{row.quantity_sold}</Text>
            </View>
          ))}
          {data.length===0 && <Text style={{ fontSize:12, color:'#555' }}>No records.</Text>}
        </View>
      )}
    </ScrollView>
  );
}

const ti = { borderWidth:1, borderColor:'#d1d5db', padding:8, borderRadius:8, marginBottom:8 } as const;
