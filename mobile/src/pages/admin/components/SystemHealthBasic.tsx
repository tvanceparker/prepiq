import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { useSystemHealth } from '../hooks/useSystemHealth';
import { useNavigation } from '@react-navigation/native';
import {
  Provider as PaperProvider,
  Text,
  Card,
  ActivityIndicator,
  Button,
  Chip,
  IconButton,
  Snackbar,
  TextInput,
  Divider,
  Banner,
} from 'react-native-paper';

export default function SystemHealthBasic() {
  const { data, loading, error, runSalesCheck, salesCheckLoading, refresh, checkDate, setCheckDate } =
    useSystemHealth();
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const navigation = useNavigation<any>();

  if (loading)
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading system health…</Text>
        </View>
      </PaperProvider>
    );

  if (error)
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Text>Error loading system health</Text>
          <Button mode="contained" style={{ marginTop: 12 }} onPress={() => refresh()}>
            Retry
          </Button>
        </View>
      </PaperProvider>
    );

  if (!data)
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Text>No data.</Text>
        </View>
      </PaperProvider>
    );

  const { overall_status, ...checks } = data as any;

  const onRunSales = async () => {
    try {
      await runSalesCheck();
      setSnack({ visible: true, message: 'Sales data check triggered' });
    } catch (e) {
      setSnack({ visible: true, message: 'Failed to trigger sales check' });
    }
  };

  return (
    <PaperProvider>
      <View style={{ flex: 1, padding: 16 }}>
        <Card style={{ marginBottom: 12 }}>
          <Card.Title
            title="System Health"
            subtitle={`Status: ${overall_status}`}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton icon="refresh" onPress={() => refresh()} />
              </View>
            )}
          />
          <Card.Content>
            <Text style={{ marginBottom: 8 }}>Check date</Text>
            <TextInput
              mode="outlined"
              value={checkDate}
              onChangeText={setCheckDate}
              right={<TextInput.Icon icon="calendar" />}
              placeholder="YYYY-MM-DD"
              style={{ marginBottom: 12 }}
            />
            <Button mode="contained" onPress={onRunSales} loading={salesCheckLoading} disabled={salesCheckLoading}>
              Run Sales Data Check
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Title title="Checks" />
          <Card.Content>
            {Object.entries(checks).map(([k, v]: any) => (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Chip icon={v.exists ? 'check' : 'alert'}
                  selectedColor={v.exists ? 'white' : undefined}
                  selected={v.exists}
                  style={{ marginRight: 8 }}>
                  {v.exists ? 'OK' : 'Missing'}
                </Chip>
                <Text>{k}</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* TODO: Wire this to navigate to Alerts page when available */}
        <Banner
          visible
          icon="information"
          style={{ marginTop: 12 }}
          actions={[
            {
              label: 'Open Alerts',
              onPress: () => navigation.navigate('dashboard_alerts'),
            },
          ]}
        >
          Tip: After running a System Health check, open the Alerts feed to see if anything was
          triggered.
        </Banner>

        <Snackbar visible={snack.visible} onDismiss={() => setSnack({ visible: false, message: '' })} duration={2000}>
          {snack.message}
        </Snackbar>
      </View>
    </PaperProvider>
  );
}
