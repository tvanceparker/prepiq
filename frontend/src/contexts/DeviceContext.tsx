// frontend/src/contexts/DeviceContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useDeviceDetection, DeviceInfo, DeviceType } from '../hooks/useDeviceDetection';

interface DeviceContextType {
  device: DeviceInfo;
  isLoading: boolean;
  updateDeviceType: (type: DeviceType) => void;
  refresh: () => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevice = (): DeviceContextType => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

interface DeviceProviderProps {
  children: ReactNode;
}

export const DeviceProvider: React.FC<DeviceProviderProps> = ({ children }) => {
  const deviceDetection = useDeviceDetection();

  return <DeviceContext.Provider value={deviceDetection}>{children}</DeviceContext.Provider>;
};
