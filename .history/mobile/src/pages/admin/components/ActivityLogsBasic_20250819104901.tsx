import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useAdminActivityLogs } from '../hooks/useActivityLogs';

export default function ActivityLogsBasic() {
  const { data, isLoading, error, refetch, isRefetching } = useAdminActivityLogs();
  if (isLoading) return <View style={styles.center}><ActivityIndicator /></View>;
  if (error) return <View style={styles.center}><Text>Error loading activity logs</Text></View>;
  return (
    <FlatList
      contentContainerStyle={{ padding:16 }}
      data={data || []}
      keyExtractor={(item) => String(item.activity_id)}
      refreshing={isRefetching}
      onRefresh={refetch}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Card.Title title={item.action} subtitle={item.employee_name || 'Unknown'} />
          <Card.Content>
            <Text>{item.details}</Text>
            <Text variant="bodySmall" style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
          </Card.Content>
        </Card>
      )}
      ListEmptyComponent={<Text>No activity logs.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  card: { marginBottom:12 },
  date: { marginTop:4, opacity:0.7 }
});
