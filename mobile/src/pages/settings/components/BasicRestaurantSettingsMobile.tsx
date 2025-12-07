import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Image, Linking } from 'react-native';
import { ActivityIndicator, Button, Text, Chip, Snackbar, Card } from 'react-native-paper';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';
import BasicRestaurantSettingsModal from './BasicRestaurantSettingsModal';
import type { RestaurantSettings } from '../../../interfaces/settings';

export default function BasicRestaurantSettingsMobile() {
  const { settings, loading, error, saveSettings, saving, refetch, isFetching } =
    useRestaurantSettings();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState<any | null>(null);
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const withDefaults = (data: RestaurantSettings) => ({
    ...data,
    inventory_deduction_mode: data.inventory_deduction_mode ?? 'eod',
  });

  useEffect(() => {
    if (settings && visible && !formData) setFormData(withDefaults(settings));
  }, [settings, visible, formData]);

  const open = () => {
    setFormData(settings ? withDefaults(settings) : null);
    setVisible(true);
  };
  const close = () => {
    setVisible(false);
  };
  const updateField = (field: string, value: any) =>
    setFormData((s: any) => ({ ...(s || {}), [field]: value }));

  const handleSave = async () => {
    try {
      await saveSettings(formData);
      close();
      setSnack({ visible: true, message: 'Settings saved' });
    } catch (e) {
      close();
      setSnack({ visible: true, message: 'Failed to save settings' });
    }
  };

  if (loading)
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading settings…</Text>
      </View>
    );
  if (error)
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <Text style={{ marginBottom: 12 }}>Error loading settings</Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  if (!settings) return null;

  const mapUrl = useMemo(() => {
    if (!settings?.latitude || !settings?.longitude) return null;
    const lat = settings.latitude;
    const lng = settings.longitude;
    const zoom = 14;
    const size = '600x300';
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${lat},${lng},red-pushpin`;
  }, [settings?.latitude, settings?.longitude]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={!!isFetching} onRefresh={() => refetch()} />}
    >
      <Text variant="titleLarge" style={{ marginBottom: 12 }}>
        Restaurant Settings
      </Text>

      {mapUrl && (
        <Image
          source={{ uri: mapUrl }}
          style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 12 }}
          resizeMode="cover"
        />
      )}

      <Card style={{ marginBottom: 8 }}>
        <Card.Title title="General" right={() => (isFetching ? <ActivityIndicator /> : null)} />
        <Card.Content>
          <Text>
            <Text style={{ fontWeight: '600' }}>Forecast Length:</Text> {settings.forecast_length}{' '}
            days
          </Text>
          <Text>
            <Text style={{ fontWeight: '600' }}>Timezone:</Text> {settings.timezone || 'N/A'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 8 }}>
        <Card.Title title="End of Day (EOD)" />
        <Card.Content>
          <Text>
            <Text style={{ fontWeight: '600' }}>Run EOD When Closed:</Text>{' '}
            {settings.eod_run_when_closed ? 'Yes' : 'No'}
          </Text>
          <Text>
            <Text style={{ fontWeight: '600' }}>EOD Buffer Time:</Text>{' '}
            {settings.eod_run_after_close_mins} mins
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 8 }}>
        <Card.Title title="Inventory Deductions" />
        <Card.Content>
          <Text>
            <Text style={{ fontWeight: '600' }}>Mode:</Text>{' '}
            {settings.inventory_deduction_mode === 'real_time'
              ? 'Real-time (Pro/Master)'
              : 'End of Day'}
          </Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>
            {settings.inventory_deduction_mode === 'real_time'
              ? 'Orders immediately adjust ingredient and batch inventory. Alerts fire if a deduction fails.'
              : 'Inventory is deducted during the nightly EOD run. Switch to real-time to catch shortages sooner.'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 8 }}>
        <Card.Title title="Sales Channels" />
        <Card.Content>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {settings.sales_channels?.length ? (
              settings.sales_channels.map((ch: string, idx: number) => (
                <Chip key={`${ch}-${idx}`} style={{ marginRight: 6, marginBottom: 6 }}>
                  {ch}
                </Chip>
              ))
            ) : (
              <Text>None</Text>
            )}
          </View>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 8 }}>
        <Card.Title title="Location" />
        <Card.Content>
          <Text style={{ marginBottom: 6 }}>
            <Text style={{ fontWeight: '600' }}>Coordinates:</Text>{' '}
            {settings.latitude ? `${settings.latitude}, ${settings.longitude}` : 'Not set'}
          </Text>
          {settings.latitude && settings.longitude ? (
            <Button
              mode="outlined"
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`
                )
              }
            >
              Open in Maps
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      <Button style={{ marginTop: 12 }} mode="contained" onPress={open}>
        Edit
      </Button>

      <BasicRestaurantSettingsModal
        visible={visible}
        formData={formData}
        saving={saving}
        onChange={updateField}
        onClose={close}
        onSave={handleSave}
      />

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, message: '' })}
        duration={2000}
      >
        {snack.message}
      </Snackbar>
    </ScrollView>
  );
}
