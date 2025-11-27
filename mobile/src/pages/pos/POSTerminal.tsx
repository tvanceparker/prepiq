// src/pages/pos/POSTerminal.tsx
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import POSBasic from './components/POSBasic';

export default function POSTerminal(): React.ReactElement | null {
  const { tier } = useContext(AuthContext) || {};

  // All tiers use the same POSBasic for now
  // Can add POSPro / POSMaster later with enhanced features (Stripe Terminal, cash drawer, etc.)
  switch (tier) {
    case 'basic':
    case 'pro':
    case 'master':
    default:
      return <POSBasic />;
  }
}
