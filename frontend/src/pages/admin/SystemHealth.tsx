// src/pages/admin/SystemHealth.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { SystemHealthBasic } from './components/SystemHealthBasic';

export default function SystemHealth() {
  const { tier } = useContext(AuthContext);
  const today = new Date().toISOString().split('T')[0];

  switch (tier) {
    case 'basic':
      return <SystemHealthBasic initialDate={today} />;
    // case "pro":
    //   return <TenantInfoPro />;
    // case "master":
    //   return <TenantInfoMaster />;
    default:
      return <SystemHealthBasic initialDate={today} />;
  }
}
