import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SystemHealthBasic from './components/SystemHealthBasic';

export default function SystemHealth() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'full':
    default:
      return <SystemHealthBasic />;
  }
}
