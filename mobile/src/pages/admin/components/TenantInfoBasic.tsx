import React from 'react';
import { View, Text } from 'react-native';
import useTenantInfo from '../hooks/useTenantInfo';

export default function TenantInfoBasic() {
  const { info, loading, error } = useTenantInfo();
  if (loading) return <Text>Loading tenant info...</Text>;
  if (error) return <Text>Error loading tenant info</Text>;
  if (!info) return <Text>No tenant info.</Text>;
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Tenant Info</Text>
      <Text>Name: {info.name}</Text>
      <Text>Email: {info.email}</Text>
      <Text>Subscription: {info.subscription_tier} ({info.subscription_status})</Text>
    </View>
  );
}
