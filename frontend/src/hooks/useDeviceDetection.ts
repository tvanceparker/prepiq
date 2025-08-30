// frontend/src/hooks/useDeviceDetection.ts
import { useState, useEffect } from 'react';

export type DeviceType = 'desktop' | 'mobile' | 'pos_terminal' | 'kitchen_display';

export interface DeviceInfo {
  type: DeviceType;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  isMobileApp: boolean;
  capabilities: {
    touch: boolean;
    orientation: boolean;
    highResolution: boolean;
  };
}

export interface DeviceDetectionResult {
  device: DeviceInfo;
  isLoading: boolean;
  updateDeviceType: (type: DeviceType) => void;
  refresh: () => void;
}

const STORAGE_KEY = 'prepiq_device_type';

const detectDeviceType = (info: DeviceInfo): DeviceType => {
  // Check if manually set in storage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ['desktop', 'mobile', 'pos_terminal', 'kitchen_display'].includes(stored)) {
    return stored as DeviceType;
  }

  // Auto-detection logic
  const { screenWidth, isTouch, isMobileApp } = info;

  // Mobile app is always mobile type unless manually configured
  if (isMobileApp) {
    return 'mobile';
  }

  // Small screens are mobile
  if (screenWidth < 768) {
    return 'mobile';
  }

  // Touch devices with large screens are likely POS terminals
  if (isTouch && screenWidth >= 1024) {
    return 'pos_terminal';
  }

  // Large non-touch screens are desktop
  if (!isTouch && screenWidth >= 1024) {
    return 'desktop';
  }

  // Medium screens default to desktop
  return 'desktop';
};

const getDeviceCapabilities = (): DeviceInfo['capabilities'] => {
  return {
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    orientation: 'orientation' in window,
    highResolution: window.devicePixelRatio > 1,
  };
};

const getDeviceInfo = (): DeviceInfo => {
  const capabilities = getDeviceCapabilities();

  return {
    type: 'desktop', // Will be updated by detectDeviceType
    isTouch: capabilities.touch,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    userAgent: navigator.userAgent,
    isMobileApp:
      /ReactNative|Expo/.test(navigator.userAgent) ||
      (window as any).ReactNativeWebView !== undefined,
    capabilities,
  };
};

export const useDeviceDetection = (): DeviceDetectionResult => {
  const [device, setDevice] = useState<DeviceInfo>(getDeviceInfo);
  const [isLoading, setIsLoading] = useState(true);

  const updateDeviceType = (type: DeviceType) => {
    localStorage.setItem(STORAGE_KEY, type);
    setDevice(prev => ({ ...prev, type }));
  };

  const refresh = () => {
    setIsLoading(true);
    const newDeviceInfo = getDeviceInfo();
    newDeviceInfo.type = detectDeviceType(newDeviceInfo);
    setDevice(newDeviceInfo);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setDevice(prev => {
        const updated = {
          ...prev,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        };
        updated.type = detectDeviceType(updated);
        return updated;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    device,
    isLoading,
    updateDeviceType,
    refresh,
  };
};

export const isDedicatedDevice = (deviceType?: DeviceType | null): boolean => {
  return deviceType === 'pos_terminal' || deviceType === 'kitchen_display';
};
