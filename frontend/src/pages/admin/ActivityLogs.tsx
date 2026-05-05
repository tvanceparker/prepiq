// src/pages/admin/ActivityLogs.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import ActivityLogsBasic from './components/ActivityLogsBasic';

export default function TenantInfo() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case 'basic':
      return <ActivityLogsBasic />;
    default:
      return <ActivityLogsBasic />;
  }
}
