import React from 'react';
import BasicAccountSettingsMobile from './components/BasicAccountSettingsMobile';
import { useAuth } from '../../contexts/AuthContext';

export default function AccountSettings() {
  const { tier } = useAuth();
  // Future: switch by tier (pro/master custom components)
  return <BasicAccountSettingsMobile />;
}
