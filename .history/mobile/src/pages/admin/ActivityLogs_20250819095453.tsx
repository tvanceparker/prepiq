import React, { useContext } from 'react';
import ActivityLogsBasic from './components/ActivityLogsBasic';
import { AuthContext } from '../../contexts/AuthContext';

export default function ActivityLogs() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    default:
      return <ActivityLogsBasic />;
  }
}
