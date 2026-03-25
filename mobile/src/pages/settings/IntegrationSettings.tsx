// src/pages/settings/IntegrationSettings.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  List,
  Divider,
  Snackbar,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  disconnectPOS,
  getPOSImportHealth,
  getPOSIntegrationStatus,
  getPOSModeSettings,
  triggerPOSSync,
  updatePOSModeSettings,
} from '../../api/settings';
import type { POSMode, POSProvider } from '../../interfaces/pos';

export default function IntegrationSettings() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const posSettingsQuery = useQuery({
    queryKey: ['mobilePosSettings'],
    queryFn: getPOSModeSettings,
  });

  const posStatusQuery = useQuery({
    queryKey: ['mobilePosStatus'],
    queryFn: getPOSIntegrationStatus,
    enabled: posSettingsQuery.data?.pos_mode === 'external',
  });

  const posImportHealthQuery = useQuery({
    queryKey: ['mobilePosImportHealth'],
    queryFn: () => getPOSImportHealth(10),
    enabled: posSettingsQuery.data?.pos_mode === 'external',
  });

  const updateModeMutation = useMutation({
    mutationFn: (data: { pos_mode: POSMode; pos_provider?: string | null; cash_drawer_enabled?: boolean }) => {
      return updatePOSModeSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobilePosSettings'] });
      queryClient.invalidateQueries({ queryKey: ['mobilePosStatus'] });
      queryClient.invalidateQueries({ queryKey: ['mobilePosImportHealth'] });
      setSnackbar({ visible: true, message: 'Settings updated' });
    },
    onError: (err: any) => {
      setSnackbar({ visible: true, message: err?.message || 'Failed to update' });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => triggerPOSSync(7),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['mobilePosStatus'] });
      queryClient.invalidateQueries({ queryKey: ['mobilePosImportHealth'] });
      setSnackbar({ visible: true, message: `Sync complete: ${data.orders_synced} orders synced` });
    },
    onError: (err: any) => {
      setSnackbar({ visible: true, message: err?.message || 'Sync failed' });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectPOS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobilePosSettings'] });
      queryClient.invalidateQueries({ queryKey: ['mobilePosStatus'] });
      queryClient.invalidateQueries({ queryKey: ['mobilePosImportHealth'] });
      setSnackbar({ visible: true, message: 'POS disconnected' });
    },
    onError: (err: any) => {
      setSnackbar({ visible: true, message: err?.message || 'Failed to disconnect POS' });
    },
  });

  const handleModeChange = (newMode: POSMode) => {
    updateModeMutation.mutate({
      pos_mode: newMode,
      pos_provider: newMode === 'external' ? 'square' : null,
      cash_drawer_enabled: posSettingsQuery.data?.cash_drawer_enabled ?? true,
    });
  };

  const providerLabel = (provider?: POSProvider) => provider && provider !== 'none' ? provider : 'square';

  const isLoading = posSettingsQuery.isLoading;
  const posSettings = posSettingsQuery.data;
  const posStatus = posStatusQuery.data;
  const posImportHealth = posImportHealthQuery.data;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        Integration Settings
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Connect your POS and monitor import health
      </Text>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <>
          <Card style={styles.card} mode="outlined">
            <Card.Title
              title="External POS Integration"
              titleVariant="titleMedium"
              left={() => (
                <MaterialCommunityIcons
                  name="point-of-sale"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginLeft: 16 }}
                />
              )}
              right={() => (
                <Chip compact mode={posStatus?.connected ? 'flat' : 'outlined'}>
                  {posStatus?.connected ? 'Connected' : 'Not Connected'}
                </Chip>
              )}
            />
            <Card.Content>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                PrepIQ v1 uses your external POS as the source of truth for sales, inventory
                deduction, and forecasting inputs.
              </Text>
              {posSettings?.pos_mode !== 'external' && (
                <Button mode="outlined" onPress={() => handleModeChange('external')} style={styles.inlineButton}>
                  Switch to External Mode
                </Button>
              )}
              {posStatus?.connected && (
                <View style={styles.statusRow}>
                  <Chip compact icon="store">{posStatus.merchant_id || 'Connected merchant'}</Chip>
                  <Chip compact icon="map-marker">{posStatus.location_id || 'Default location'}</Chip>
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              {!posStatus?.connected ? (
                <Button mode="outlined" onPress={() => setSnackbar({ visible: true, message: 'Connect POS from the web app to complete OAuth.' })}>
                  Connect {providerLabel(posSettings?.pos_provider)}
                </Button>
              ) : (
                <>
                  <Button mode="outlined" onPress={() => syncMutation.mutate()} loading={syncMutation.isPending}>
                    Sync Now
                  </Button>
                  <Button mode="text" textColor={theme.colors.error} onPress={() => disconnectMutation.mutate()} loading={disconnectMutation.isPending}>
                    Disconnect
                  </Button>
                </>
              )}
            </Card.Actions>
          </Card>

          {posStatus?.connected && (
            <>
              <Card style={styles.card} mode="outlined">
                <Card.Title
                  title="Import Health"
                  titleVariant="titleMedium"
                  left={() => (
                    <MaterialCommunityIcons
                      name="chart-timeline-variant"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 16 }}
                    />
                  )}
                />
                <Card.Content>
                  {posImportHealthQuery.isLoading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <View style={styles.summaryWrap}>
                      <Chip compact>Recent Imports: {posImportHealth?.summary.total_recent_imports ?? 0}</Chip>
                      <Chip compact>Unmapped: {posImportHealth?.summary.unmapped_items ?? 0}</Chip>
                      <Chip compact>Pending: {posImportHealth?.summary.pending_deductions ?? 0}</Chip>
                      <Chip compact>Failures: {posImportHealth?.summary.failed_deductions ?? 0}</Chip>
                    </View>
                  )}
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                    Last imported sale:{' '}
                    {posImportHealth?.summary.last_import_at
                      ? new Date(posImportHealth.summary.last_import_at).toLocaleString()
                      : 'No imports yet'}
                  </Text>
                </Card.Content>
              </Card>

              <Card style={styles.card} mode="outlined">
                <Card.Title
                  title="Unmapped POS Items"
                  titleVariant="titleMedium"
                  left={() => (
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 16 }}
                    />
                  )}
                />
                <Card.Content>
                  {posImportHealth?.unmapped_items.length ? (
                    posImportHealth.unmapped_items.map(item => (
                      <List.Item
                        key={item.mapping_id}
                        title={item.external_item_name || item.external_item_id}
                        description={`External ID: ${item.external_item_id}`}
                        left={() => <List.Icon icon="link-off" />}
                      />
                    ))
                  ) : (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      All imported POS items are currently mapped.
                    </Text>
                  )}
                </Card.Content>
              </Card>

              <Card style={styles.card} mode="outlined">
                <Card.Title
                  title="Recent Import History"
                  titleVariant="titleMedium"
                  left={() => (
                    <MaterialCommunityIcons
                      name="history"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 16 }}
                    />
                  )}
                />
                <Card.Content>
                  {posImportHealth?.recent_imports.length ? (
                    posImportHealth.recent_imports.map(item => (
                      <List.Item
                        key={item.order_id}
                        title={item.external_order_id || `Import #${item.order_id}`}
                        description={`$${item.total.toFixed(2)} • ${item.inventory_deduction_state} • ${item.unmapped_item_count} unmapped`}
                        right={() => (
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {item.imported_at ? new Date(item.imported_at).toLocaleDateString() : ''}
                          </Text>
                        )}
                      />
                    ))
                  ) : (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      No POS imports recorded yet.
                    </Text>
                  )}
                </Card.Content>
              </Card>
            </>
          )}

          <Card style={styles.card} mode="outlined">
            <Card.Title
              title="Data Sync"
              titleVariant="titleMedium"
              left={() => (
                <MaterialCommunityIcons
                  name="sync"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginLeft: 16 }}
                />
              )}
            />
            <Card.Content>
              <List.Item
                title="Last Sync"
                description={
                  posStatus?.last_sync
                    ? new Date(posStatus.last_sync).toLocaleString()
                    : 'No sync completed yet'
                }
                right={() => (
                  <Chip compact icon={posStatus?.connected ? 'check-circle' : 'clock-outline'}>
                    {posStatus?.sync_status || 'idle'}
                  </Chip>
                )}
              />
              <Divider />
              <List.Item
                title="Import Mode"
                description="Square sales import straight into PrepIQ sales and inventory workflows"
                right={() => (
                  <Chip compact icon="database-import">External</Chip>
                )}
              />
            </Card.Content>
          </Card>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}
            mode="contained"
          >
            <Card.Content>
              <View style={styles.infoRow}>
                <List.Icon icon="information" color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                  PrepIQ v1 surfaces external POS connection status, unmapped imported items, and
                  import history here. Live in-house order boards remain out of the active launch
                  product.
                </Text>
              </View>
            </Card.Content>
          </Card>
        </>
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
  },
  loader: {
    marginTop: 64,
  },
  card: {
    marginBottom: 16,
  },
  inlineButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  summaryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
