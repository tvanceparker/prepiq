// src/pages/pos/DeviceRegistration.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  TextInput,
  SegmentedButtons,
  Snackbar,
  List,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { usePOS } from '../../hooks/usePOS';
import type { POSDevice } from '../../interfaces/pos';

type DeviceType = 'pos_terminal' | 'kitchen_display' | 'mobile';

export default function DeviceRegistration() {
  const theme = useTheme();
  const { devices, isLoadingDevices, registerDevice, isRegisteringDevice, unregisterDevice } =
    usePOS();

  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('pos_terminal');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleRegister = async () => {
    if (!deviceName.trim()) {
      setSnackbar({ visible: true, message: 'Please enter a device name' });
      return;
    }

    try {
      await registerDevice({
        device_name: deviceName.trim(),
        device_type: deviceType,
      });
      setDeviceName('');
      setSnackbar({ visible: true, message: 'Device registered successfully!' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to register device' });
    }
  };

  const handleUnregister = async (deviceId: number) => {
    try {
      await unregisterDevice(deviceId);
      setSnackbar({ visible: true, message: 'Device unregistered' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to unregister' });
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'pos_terminal':
        return 'point-of-sale';
      case 'kitchen_display':
        return 'chef-hat';
      case 'waiter_tablet':
        return 'tablet';
      default:
        return 'devices';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        Device Registration
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Register POS terminals, kitchen displays, and waiter tablets
      </Text>

      {/* Registration Form */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="Register New Device" />
        <Card.Content>
          <TextInput
            label="Device Name"
            value={deviceName}
            onChangeText={setDeviceName}
            mode="outlined"
            placeholder="e.g., Front Counter POS"
            style={styles.input}
          />
          <Text
            variant="labelMedium"
            style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
          >
            Device Type
          </Text>
          <SegmentedButtons
            value={deviceType}
            onValueChange={v => setDeviceType(v as DeviceType)}
            buttons={[
              { value: 'pos_terminal', label: 'POS', icon: 'point-of-sale' },
              { value: 'kitchen_display', label: 'Kitchen', icon: 'chef-hat' },
              { value: 'waiter_tablet', label: 'Waiter', icon: 'tablet' },
            ]}
            style={styles.segmented}
          />
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={isRegisteringDevice}
            disabled={isRegisteringDevice || !deviceName.trim()}
          >
            Register Device
          </Button>
        </Card.Actions>
      </Card>

      {/* Registered Devices */}
      <Card style={styles.card} mode="outlined">
        <Card.Title title="Registered Devices" />
        <Card.Content>
          {isLoadingDevices ? (
            <ActivityIndicator style={styles.loader} />
          ) : devices && devices.length > 0 ? (
            devices.map((device: POSDevice, index: number) => (
              <View key={device.device_id}>
                {index > 0 && <Divider />}
                <List.Item
                  title={device.device_name}
                  description={`${device.device_type?.replace('_', ' ')} • ${
                    device.is_active ? 'Active' : 'Inactive'
                  }`}
                  left={props => <List.Icon {...props} icon={getDeviceIcon(device.device_type)} />}
                  right={() => (
                    <Button
                      mode="text"
                      textColor={theme.colors.error}
                      onPress={() => handleUnregister(parseInt(device.device_id))}
                      compact
                    >
                      Remove
                    </Button>
                  )}
                />
              </View>
            ))
          ) : (
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: 16 }}
            >
              No devices registered yet
            </Text>
          )}
        </Card.Content>
      </Card>

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
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  segmented: {
    marginBottom: 8,
  },
  loader: {
    padding: 24,
  },
});
