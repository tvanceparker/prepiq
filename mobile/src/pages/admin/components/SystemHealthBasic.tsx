import React from 'react';
import { View, Text, Button } from 'react-native';
import { useSystemHealth } from '../hooks/useSystemHealth';

export default function SystemHealthBasic() {
  const { data, loading, error, runSalesCheck, salesCheckLoading, salesCheckMessage, refresh } =
    useSystemHealth();
  if (loading) return <Text>Loading system health...</Text>;
  if (error) return <Text>Error loading system health</Text>;
  if (!data) return <Text>No data.</Text>;
  const { overall_status, ...checks } = data as any;
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
        System Health: {overall_status}
      </Text>
      {Object.entries(checks).map(([k, v]: any) => (
        <Text key={k}>
          {k}: {v.exists ? 'OK' : 'Missing'}
        </Text>
      ))}
      <View style={{ marginTop: 12 }}>
        <Button
          title={salesCheckLoading ? 'Running...' : 'Run Sales Data Check'}
          onPress={() => runSalesCheck()}
          disabled={salesCheckLoading}
        />
        <Button title="Refresh" onPress={() => refresh()} />
      </View>
      {salesCheckMessage && <Text style={{ marginTop: 8 }}>{salesCheckMessage}</Text>}
    </View>
  );
}
