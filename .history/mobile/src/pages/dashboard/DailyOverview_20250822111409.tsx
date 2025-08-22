import React, { useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { AuthContext } from '../../contexts/AuthContext';
import { useDailyOverview } from './hooks/useDailyOverview';
import BasicOverviewMobile from './components/BasicOverviewMobile';

export default function DailyOverview(props: any) {
  const { tier } = useContext(AuthContext);
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  // Use route param 'refresh' to force a remount of hook by keying a state
  const refreshKey = props?.route?.params?.refresh
    ? String(props?.route?.params?.refresh)
    : 'stable';
  const { data, loading, error } = useDailyOverview(refreshKey);

  // If coming back from wizard with a toast request, show it
  useEffect(() => {
    const toast = props?.route?.params?.toast;
    if (toast) {
      setSnack({ visible: true, message: String(toast) });
      // clear so it doesn’t re-show on re-render
      props?.navigation?.setParams?.({ toast: undefined, refresh: undefined });
    }
  }, [props?.route?.params?.toast]);

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
      return (
        <>
          <BasicOverviewMobile data={data} navigation={props?.navigation} />
          <Snackbar
            visible={snack.visible}
            onDismiss={() => setSnack({ visible: false, message: '' })}
            duration={2500}
          >
            {snack.message}
          </Snackbar>
        </>
      );
  }
}
