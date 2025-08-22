import React, { useContext } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../contexts/AuthContext';
import { useDailyOverview } from './hooks/useDailyOverview';
import BasicOverviewMobile from './components/BasicOverviewMobile';

export default function DailyOverview(props: any) {
  const { tier } = useContext(AuthContext);
  const { data, loading, error } = useDailyOverview();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  if (error)
    return (
      <View style={{ padding: 16 }}>
        <Text>Error loading dashboard: {error.message}</Text>
      </View>
    );
  switch (tier) {
    case 'basic':
    case 'pro':
    case 'master':
    default:
  return <BasicOverviewMobile data={data} navigation={props?.navigation} />;
  }
}
