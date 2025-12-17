// src/pages/pos/hooks/usePOS.ts
import { useState, useEffect } from 'react';
import {
  registerDevice,
  refreshDeviceToken,
  getDeviceSettings,
  updateDeviceSettings,
  generateDeviceFingerprint,
} from '../../../api/pos';
import {
  DeviceRegistrationRequest,
  DeviceRegistrationResponse,
  DeviceSettingsUpdate,
  DeviceSettingsUpdateResponse,
  DeviceTokenResponse,
  POSDevice,
} from '../../../interfaces/pos';

export const usePOS = () => {
  const [device, setDevice] = useState<POSDevice | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
      const storedDeviceId = localStorage.getItem('pos_device_id');
      const storedToken = localStorage.getItem('pos_device_token');

      if (storedDeviceId && storedToken) {
        const numericId = Number(storedDeviceId);
        if (Number.isNaN(numericId)) {
          localStorage.removeItem('pos_device_id');
          localStorage.removeItem('pos_device_token');
          setIsRegistered(false);
          return;
        }
        // Try to refresh the token
        try {
          const fingerprint = generateDeviceFingerprint();
          const response = await refreshDeviceToken({
            device_id: numericId,
            fingerprint,
          });

          setDeviceToken(response.device_token);
          setIsRegistered(true);

          // Get device settings
          const settings = await getDeviceSettings(String(numericId));
          setDevice({
            device_id: numericId,
            device_type: settings.device_type as any,
            device_name: settings.device_name,
            restaurant_id: settings.restaurant_id,
            is_active: true,
            last_seen: new Date().toISOString(),
            settings: settings.merged_settings,
          });
        } catch (error) {
          // Token refresh failed, clear stored data
          localStorage.removeItem('pos_device_id');
          localStorage.removeItem('pos_device_token');
          setIsRegistered(false);
        }
      }
    } catch (error) {
      console.error('Failed to initialize device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const registerDeviceHandler = async (
    request: DeviceRegistrationRequest
  ): Promise<DeviceRegistrationResponse> => {
    const response = await registerDevice(request);

    // Store device info
    localStorage.setItem('pos_device_id', String(response.device_id));
    localStorage.setItem('pos_device_token', response.device_token);

    setDeviceToken(response.device_token);
    setIsRegistered(true);

    setDevice({
      device_id: response.device_id,
      device_type: response.device_type as any,
      device_name: response.device_name,
      restaurant_id: response.restaurant_id,
      is_active: true,
      last_seen: new Date().toISOString(),
      settings: response.merged_settings || {},
    });

    return response;
  };

  const refreshToken = async (): Promise<DeviceTokenResponse> => {
    if (!device?.device_id) {
      throw new Error('No device registered');
    }

    const fingerprint = generateDeviceFingerprint();
    const response = await refreshDeviceToken({
      device_id: device.device_id,
      fingerprint,
    });

    setDeviceToken(response.device_token);
    localStorage.setItem('pos_device_token', response.device_token);

    return response;
  };

  const updateSettings = async (
    settings: DeviceSettingsUpdate
  ): Promise<DeviceSettingsUpdateResponse> => {
    if (!device?.device_id) {
      throw new Error('No device registered');
    }

    const response = await updateDeviceSettings(String(device.device_id), settings);

    // Update local device state
    setDevice(prev =>
      prev
        ? {
            ...prev,
            device_name: response.device_name || prev.device_name,
            settings: response.merged_settings,
          }
        : null
    );

    return response;
  };

  const logout = () => {
    localStorage.removeItem('pos_device_id');
    localStorage.removeItem('pos_device_token');
    setDevice(null);
    setDeviceToken(null);
    setIsRegistered(false);
  };

  return {
    device,
    deviceToken,
    isRegistered,
    isLoading,
    registerDevice: registerDeviceHandler,
    refreshToken,
    updateSettings,
    logout,
  };
};
