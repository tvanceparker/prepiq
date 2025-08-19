import React, { useState, useCallback } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, Text, Button, Chip } from 'react-native-paper';

type Level = 'Critical' | 'Warning' | 'Info';
interface AlertItem { id:number; level:Level; message:string; date:string; resolved:boolean }

const seed: AlertItem[] = [
  { id:1, level:'Critical', message:'Database connection lost', date:'2025-06-06 14:22', resolved:false },
  { id:2, level:'Warning', message:'Inventory sync delayed by 15 mins', date:'2025-06-06 13:00', resolved:true },
  { id:3, level:'Info', message:'New system update available', date:'2025-06-05 09:15', resolved:false },
];

export default function SystemAlertsBasic() {
  const [alerts, setAlerts] = useState(seed);
  const toggle = useCallback((id:number) => setAlerts(prev => prev.map(a => a.id===id ? { ...a, resolved: !a.resolved } : a)), []);
  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={alerts}
      keyExtractor={i => String(i.id)}
      renderItem={({ item }) => {
        const color = item.level === 'Critical' ? '#dc2626' : item.level === 'Warning' ? '#d97706' : '#2563eb';
        return (
          <Card style={styles.card}>
            <Card.Title title={item.message} subtitle={`${item.level} • ${item.date}`} titleNumberOfLines={2} />
            <Card.Content>
              <View style={styles.row}>
                <Chip style={{ backgroundColor: color }} textStyle={{ color:'#fff', fontSize:12 }}>{item.level}</Chip>
                <Chip mode={item.resolved ? 'flat' : 'outlined'} style={{ marginLeft:8 }} icon={item.resolved ? 'check-circle' : undefined}>{item.resolved ? 'Resolved' : 'Open'}</Chip>
              </View>
              <Button mode="contained-tonal" onPress={() => toggle(item.id)} style={{ marginTop:8 }}>{item.resolved ? 'Mark Unresolved' : 'Mark Resolved'}</Button>
            </Card.Content>
          </Card>
        );
      }}
      ListEmptyComponent={<Text style={{ textAlign:'center', marginTop:40 }}>No system alerts.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding:16 },
  card: { marginBottom:12 },
  row: { flexDirection:'row', alignItems:'center', marginBottom:4 },
});
