import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SystemAlertsBasic from './components/SystemAlertsBasic';

export default function SystemAlerts() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'master':
    default:
      return <SystemAlertsBasic />;
  }
}
