import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RegistrationModalContextType {
  open: boolean;
  openModal: (opts?: { defaultName?: string; deviceType?: string }) => void;
  closeModal: () => void;
  defaultName?: string;
  deviceType?: string;
}

const RegistrationModalContext = createContext<RegistrationModalContextType | undefined>(undefined);

export const useRegistrationModal = () => {
  const ctx = useContext(RegistrationModalContext);
  if (!ctx) throw new Error('useRegistrationModal must be used within RegistrationModalProvider');
  return ctx;
};

export const RegistrationModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [defaultName, setDefaultName] = useState<string | undefined>(undefined);
  const [deviceType, setDeviceType] = useState<string | undefined>(undefined);

  const openModal = (opts?: { defaultName?: string; deviceType?: string }) => {
    setDefaultName(opts?.defaultName);
    setDeviceType(opts?.deviceType);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setDefaultName(undefined);
    setDeviceType(undefined);
  };

  return (
    <RegistrationModalContext.Provider
      value={{ open, openModal, closeModal, defaultName, deviceType }}
    >
      {children}
    </RegistrationModalContext.Provider>
  );
};

export default RegistrationModalContext;
