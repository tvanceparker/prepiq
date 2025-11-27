// src/pages/settings/IntegrationSettings.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  Switch,
  List,
  Divider,
  Snackbar,
  ActivityIndicator,
  Chip,
  TextInput,
  Portal,
  Dialog,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { AuthContext } from '../../contexts/AuthContext';

interface IntegrationConfig {
  pos_provider: string | null;
  weather_api_key: string | null;
  stripe_enabled: boolean;
  stripe_terminal_enabled: boolean;
}

export default function IntegrationSettings() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { tier } = useContext(AuthContext);

  const [dialogType, setDialogType] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Fetch integration config
  const { data: config, isLoading } = useQuery<IntegrationConfig>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const res = await api.get('/settings/integrations');
      return res.data;
    },
  });

  // Update integration
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<IntegrationConfig>) => {
      const res = await api.patch('/settings/integrations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setSnackbar({ visible: true, message: 'Settings updated' });
    },
    onError: (err: any) => {
      setSnackbar({ visible: true, message: err?.message || 'Failed to update' });
    },
  });

  const handleToggle = (key: keyof IntegrationConfig, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  const handleSaveApiKey = () => {
    if (dialogType === 'weather') {
      updateMutation.mutate({ weather_api_key: apiKey || null });
    }
    setDialogType(null);
    setApiKey('');
  };

  const openDialog = (type: string, currentValue?: string | null) => {
    setDialogType(type);
    setApiKey(currentValue || '');
  };

  const isMaster = tier === 'master';

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
        Manage third-party service connections
      </Text>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <>
          {/* POS Integration */}
          <Card style={styles.card} mode="outlined">
            <Card.Title
              title="POS System"
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
                <Chip compact mode={config?.pos_provider ? 'flat' : 'outlined'}>
                  {config?.pos_provider || 'Not Connected'}
                </Chip>
              )}
            />
            <Card.Content>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Connect your POS system to sync orders and sales data automatically.
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="outlined"
                onPress={() =>
                  setSnackbar({ visible: true, message: 'POS setup available in web app' })
                }
              >
                Configure POS
              </Button>
            </Card.Actions>
          </Card>

          {/* Stripe Payments */}
          <Card style={styles.card} mode="outlined">
            <Card.Title
              title="Stripe Payments"
              titleVariant="titleMedium"
              left={() => (
                <MaterialCommunityIcons
                  name="credit-card"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginLeft: 16 }}
                />
              )}
            />
            <Card.Content>
              <List.Item
                title="Enable Stripe"
                description="Accept credit card payments"
                right={() => (
                  <Switch
                    value={config?.stripe_enabled || false}
                    onValueChange={v => handleToggle('stripe_enabled', v)}
                    disabled={updateMutation.isPending}
                  />
                )}
              />
              <Divider />
              <List.Item
                title="Stripe Terminal"
                description="In-person card reader support"
                right={() => (
                  <Switch
                    value={config?.stripe_terminal_enabled || false}
                    onValueChange={v => handleToggle('stripe_terminal_enabled', v)}
                    disabled={updateMutation.isPending || !config?.stripe_enabled}
                  />
                )}
              />
            </Card.Content>
          </Card>

          {/* Weather API */}
          {isMaster && (
            <Card style={styles.card} mode="outlined">
              <Card.Title
                title="Weather Integration"
                titleVariant="titleMedium"
                left={() => (
                  <MaterialCommunityIcons
                    name="weather-partly-cloudy"
                    size={24}
                    color={theme.colors.primary}
                    style={{ marginLeft: 16 }}
                  />
                )}
                right={() => (
                  <Chip compact mode={config?.weather_api_key ? 'flat' : 'outlined'}>
                    {config?.weather_api_key ? 'Connected' : 'Not Set'}
                  </Chip>
                )}
              />
              <Card.Content>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Weather data improves forecast accuracy by factoring in local conditions.
                </Text>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="outlined"
                  onPress={() => openDialog('weather', config?.weather_api_key)}
                >
                  {config?.weather_api_key ? 'Update API Key' : 'Add API Key'}
                </Button>
              </Card.Actions>
            </Card>
          )}

          {/* Data Sync Status */}
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
                description="Automatic sync runs every hour"
                right={() => (
                  <Chip compact icon="check-circle">
                    Active
                  </Chip>
                )}
              />
              <Divider />
              <List.Item
                title="EOD Processing"
                description="End-of-day summaries"
                right={() => (
                  <Chip compact icon="calendar-check">
                    Enabled
                  </Chip>
                )}
              />
            </Card.Content>
          </Card>

          {/* Info Card */}
          <Card
            style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}
            mode="contained"
          >
            <Card.Content>
              <View style={styles.infoRow}>
                <List.Icon icon="information" color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ flex: 1, color: theme.colors.onSurfaceVariant }}>
                  Some integrations require additional setup in the web dashboard. Visit the desktop
                  version for full configuration options.
                </Text>
              </View>
            </Card.Content>
          </Card>
        </>
      )}

      {/* API Key Dialog */}
      <Portal>
        <Dialog visible={!!dialogType} onDismiss={() => setDialogType(null)}>
          <Dialog.Title>{dialogType === 'weather' ? 'Weather API Key' : 'API Key'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="API Key"
              value={apiKey}
              onChangeText={setApiKey}
              mode="outlined"
              secureTextEntry
              placeholder="Enter your API key"
            />
            <Text
              variant="bodySmall"
              style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}
            >
              {dialogType === 'weather'
                ? 'Get your API key from OpenWeatherMap or your weather provider.'
                : 'Enter your API key from the provider dashboard.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogType(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveApiKey}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
