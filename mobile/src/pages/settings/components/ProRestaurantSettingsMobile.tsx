import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Image, Linking, Pressable } from 'react-native';
import {
  ActivityIndicator,
  Text,
  Chip,
  Snackbar,
  Card,
  Avatar,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useRestaurantSettings } from '../hooks/useRestaurantSettings';
import BasicRestaurantSettingsModal from './BasicRestaurantSettingsModal';
import type { RestaurantSettings } from '../../../interfaces/settings';

export default function ProRestaurantSettingsMobile() {
  const { settings, loading, error, saveSettings, saving, refetch, isFetching } =
    useRestaurantSettings();
  const theme = useTheme();
  const primary = theme.colors.primary;
  const secondary = (theme as any).colors?.secondary || primary;
  const tertiary = (theme as any).colors?.tertiary || secondary;
  const surfaceVariant = (theme as any).colors?.surfaceVariant || '#f1f1f1';
  const onSurfaceVariant = (theme as any).colors?.onSurfaceVariant || '#555';
  const outline = (theme as any).colors?.outline || '#d0d0d0';
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

  const cards = useMemo(
    () => [
      {
        title: 'Forecast Length',
        value: `${settings?.forecast_length ?? '-'} days`,
        icon: 'calendar-range',
        color: primary,
      },
      {
        title: 'Timezone',
        value: settings?.timezone || 'Not configured',
        icon: 'clock-outline',
        color: secondary,
      },
      {
        title: 'Run EOD When Closed',
        value: settings?.eod_run_when_closed ? 'Enabled' : 'Disabled',
        icon: 'bell-ring-outline',
        color: settings?.eod_run_when_closed ? tertiary : outline,
      },
      {
        title: 'EOD Buffer',
        value: `${settings?.eod_run_after_close_mins ?? 0} mins`,
        icon: 'timer-sand',
        color: theme.colors.error,
      },
      {
        title: 'Inventory Deduction',
        value:
          settings?.inventory_deduction_mode === 'real_time'
            ? 'Real-time (Full tier)'
            : 'End of Day',
        icon: 'cube-outline',
        color: settings?.inventory_deduction_mode === 'real_time' ? primary : secondary,
      },
    ],
    [
      settings?.forecast_length,
      settings?.timezone,
      settings?.eod_run_when_closed,
      settings?.eod_run_after_close_mins,
      settings?.inventory_deduction_mode,
      primary,
      secondary,
      tertiary,
      outline,
      theme.colors.error,
    ]
  );

  const mapUrl = useMemo(() => {
    if (!settings?.latitude || !settings?.longitude) return null;
    const lat = settings.latitude;
    const lng = settings.longitude;
    const zoom = 14;
    const size = '600x300';
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=${lat},${lng},red-pushpin`;
  }, [settings?.latitude, settings?.longitude]);

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
        <Text onPress={() => refetch()} style={{ color: primary, fontWeight: '600' }}>
          Retry
        </Text>
      </View>
    );
  if (!settings) return null;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={!!isFetching} onRefresh={() => refetch()} />}
    >
      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Avatar.Icon
              icon="tune"
              size={48}
              style={{ backgroundColor: surfaceVariant, marginRight: 12 }}
              color={primary}
            />
            <View>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                Restaurant Settings
              </Text>
              <Text variant="bodySmall" style={{ color: onSurfaceVariant }}>
                Tap any card to edit settings
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {mapUrl && (
        <Card style={{ marginBottom: 16, overflow: 'hidden' }}>
          <Image
            source={{ uri: mapUrl }}
            style={{ width: '100%', height: 200, borderRadius: 8 }}
            resizeMode="cover"
          />
        </Card>
      )}

      <View style={{ marginBottom: 12 }}>
        <Text
          variant="titleSmall"
          style={{ fontWeight: '700', marginBottom: 8, color: theme.colors.onBackground }}
        >
          Key Settings
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {cards.map(card => (
            <Pressable key={card.title} onPress={open} style={{ width: '48%', marginBottom: 10 }}>
              {({ pressed }) => (
                <Card
                  style={{
                    opacity: pressed ? 0.7 : 1,
                  }}
                  elevation={pressed ? 2 : 1}
                >
                  <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <Avatar.Icon
                        icon={card.icon}
                        size={40}
                        style={{ backgroundColor: surfaceVariant, marginTop: 2 }}
                        color={card.color}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          variant="labelSmall"
                          style={{
                            color: onSurfaceVariant,
                            fontSize: 11,
                            fontWeight: '500',
                            marginBottom: 3,
                          }}
                        >
                          {card.title}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{
                            fontWeight: '700',
                            fontSize: 12,
                            color: theme.colors.onBackground,
                            lineHeight: 16,
                          }}
                          numberOfLines={2}
                        >
                          {card.value}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <Card style={{ marginBottom: 12 }}>
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
              <Text style={{ color: onSurfaceVariant }}>No sales channels configured</Text>
            )}
          </View>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Title title="Inventory Deductions" />
        <Card.Content>
          <Text style={{ marginBottom: 6 }}>
            {settings.inventory_deduction_mode === 'real_time'
              ? 'Real-time deductions automatically adjust ingredient and batch inventory when orders complete. Alerts fire on failures.'
              : 'End-of-day deductions run during the nightly EOD pipeline. Switch to real-time to catch shortages sooner.'}
          </Text>
          <Divider style={{ marginVertical: 6 }} />
          <Text style={{ color: onSurfaceVariant }}>
            Mode: {settings.inventory_deduction_mode === 'real_time' ? 'Real-time' : 'End of Day'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Title title="Location" />
        <Card.Content>
          <Text style={{ marginBottom: 6 }}>
            <Text style={{ fontWeight: '600' }}>Coordinates:</Text>{' '}
            {settings.latitude ? `${settings.latitude}, ${settings.longitude}` : 'Not set'}
          </Text>
          {settings.latitude && settings.longitude ? (
            <Text
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`
                )
              }
              style={{ color: primary, fontWeight: '600' }}
            >
              Open in Maps
            </Text>
          ) : null}
        </Card.Content>
      </Card>

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
