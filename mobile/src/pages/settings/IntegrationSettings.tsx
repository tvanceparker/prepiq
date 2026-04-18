// src/pages/settings/IntegrationSettings.tsx
import React from 'react';
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
import type { POSProvider } from '../../interfaces/pos';
import { useIntegrationSettings } from './hooks/useIntegrationSettings';

export default function IntegrationSettings() {
  const theme = useTheme();
  const {
    posSettings,
    posStatus,
    isLoading,
    isStatusLoading,
    posError,
    isUpdatingMode,
    isDisconnecting,
    isSyncing,
    snackbar,
    closeSnackbar,
    handleEnableExternal,
    handleProviderChange,
    handleDisconnect,
    handleSync,
    showWebSetupMessage,
  } = useIntegrationSettings();

  const selectedProvider: POSProvider =
    posSettings?.pos_provider && posSettings.pos_provider !== 'none'
      ? posSettings.pos_provider
      : 'square';

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (posError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          Failed to load POS settings. Please try again.
        </Text>
      </View>
    );
  }

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
        Manage the supported external POS connection and sync status.
      </Text>

      <Card style={styles.card} mode="outlined">
        <Card.Title
          title="External POS"
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
            PrepIQ v1 supports external POS ingestion only. Choose the active provider, review sync
            status, and finish provider authorization in the web app.
          </Text>

          <View style={styles.providerRow}>
            <Chip
              selected={selectedProvider === 'square'}
              onPress={() => handleProviderChange('square')}
              disabled={isUpdatingMode}
            >
              Square
            </Chip>
            <Chip disabled>Toast</Chip>
            <Chip disabled>Clover</Chip>
          </View>

          {posSettings?.pos_mode !== 'external' && (
            <Card style={[styles.noticeCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Card.Content>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  This restaurant is not yet set to external POS mode.
                </Text>
                <Button
                  mode="contained"
                  style={styles.noticeAction}
                  onPress={() => handleEnableExternal(selectedProvider)}
                  loading={isUpdatingMode}
                  disabled={isUpdatingMode}
                >
                  Enable External Mode
                </Button>
              </Card.Content>
            </Card>
          )}

          <Divider style={styles.divider} />

          <List.Item
            title="Provider"
            description={selectedProvider === 'square' ? 'Square' : selectedProvider || 'None'}
          />
          <Divider />
          <List.Item
            title="Connection"
            description={
              isStatusLoading
                ? 'Loading status...'
                : posStatus?.connected
                  ? `Merchant: ${posStatus.merchant_id || 'Connected'}`
                  : 'Finish provider authorization in the web app.'
            }
            right={() => (isStatusLoading ? <ActivityIndicator size="small" /> : null)}
          />
          <Divider />
          <List.Item
            title="Last Sync"
            description={
              posStatus?.last_sync ? new Date(posStatus.last_sync).toLocaleString() : 'Never'
            }
          />
          <Divider />
          <List.Item
            title="Sync Scope"
            description={`Orders ${posStatus?.sync_orders ? 'on' : 'off'} • Payments ${posStatus?.sync_payments ? 'on' : 'off'} • Menu ${posStatus?.sync_menu ? 'on' : 'off'}`}
          />
        </Card.Content>
        <Card.Actions>
          <Button mode="outlined" onPress={showWebSetupMessage}>
            Open in Web App
          </Button>
          <Button
            mode="outlined"
            onPress={handleSync}
            loading={isSyncing}
            disabled={isSyncing || !posStatus?.connected}
          >
            Sync Now
          </Button>
          <Button
            mode="text"
            onPress={handleDisconnect}
            loading={isDisconnecting}
            disabled={isDisconnecting || !posStatus?.connected}
          >
            Disconnect
          </Button>
        </Card.Actions>
      </Card>

      <Card
        style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}
        mode="contained"
      >
        <Card.Content>
          <View style={styles.infoRow}>
            <List.Icon icon="information" color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
              Internal POS terminals, cash drawers, and Stripe reader workflows are intentionally
              out of the active v1 mobile surface.
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Snackbar visible={snackbar.visible} onDismiss={closeSnackbar} duration={3000}>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  providerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  noticeCard: {
    marginTop: 16,
  },
  noticeAction: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  divider: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
