import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import useAlertsFeed from '../hooks/useAlertsFeed';

export default function AlertsFeedBasicMobile() {
  const [viewAll,setViewAll] = useState(false);
  const { alerts, loading, error, hasMore, loadMore, acknowledge, resolve, setFeedMode } = useAlertsFeed();
  useEffect(()=>{ setFeedMode(viewAll? 'all':'active'); },[viewAll]);
  return (
    <ScrollView contentContainerStyle={{ padding:16 }}>
      <Text style={{ fontSize:20, fontWeight:'600', marginBottom:12 }}>Alerts & Issues</Text>
      {error && <Text style={{ color:'#dc2626', marginBottom:8 }}>{error}</Text>}
      <TouchableOpacity onPress={()=> setViewAll(v=>!v)} style={{ backgroundColor:'#2563eb', padding:10, borderRadius:8, marginBottom:12 }}>
        <Text style={{ color:'white', fontWeight:'500' }}>{viewAll? 'View Active Only':'View All'}</Text>
      </TouchableOpacity>
      {alerts.map(a => (
        <View key={a.alert_id} style={{ padding:12, borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, marginBottom:10, backgroundColor:'white' }}>
          <Text style={{ fontWeight:'600' }}>{a.title || a.alert_type}</Text>
            <Text style={{ fontSize:12, color:'#555', marginTop:2 }}>{a.description || a.message}</Text>
          <View style={{ flexDirection:'row', marginTop:8 }}>
            <TouchableOpacity onPress={()=>acknowledge(a.alert_id)} style={{ paddingVertical:6, paddingHorizontal:10, backgroundColor:'#0369a1', borderRadius:6, marginRight:8 }}><Text style={{ color:'white', fontSize:12 }}>Ack</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>resolve(a.alert_id)} style={{ paddingVertical:6, paddingHorizontal:10, backgroundColor:'#16a34a', borderRadius:6 }}><Text style={{ color:'white', fontSize:12 }}>Resolve</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {loading && <ActivityIndicator style={{ marginTop:20 }} />}
      {hasMore && !loading && (
        <TouchableOpacity onPress={loadMore} style={{ backgroundColor:'#2563eb', padding:12, borderRadius:8, alignItems:'center', marginTop:8 }}>
          <Text style={{ color:'white' }}>Load More</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
