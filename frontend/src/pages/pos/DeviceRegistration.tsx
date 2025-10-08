// frontend/src/pages/pos/DeviceRegistration.tsx
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import DeviceRegistrationBasic from './components/DeviceRegistrationBasic';

export default function DeviceRegistration(): JSX.Element | null {
  const tier = (useContext(AuthContext) as any)?.tier;

  switch (tier) {
    case 'basic':
      return <DeviceRegistrationBasic />;
    default:
      return <DeviceRegistrationBasic />;
  }
}
