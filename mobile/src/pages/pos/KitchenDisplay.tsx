// src/pages/pos/KitchenDisplay.tsx
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import KitchenBasic from './components/KitchenBasic';

export default function KitchenDisplay(): React.ReactElement | null {
  const { tier } = useContext(AuthContext) || {};

  // All tiers use the same KitchenBasic for now
  // Can add KitchenPro / KitchenMaster later with enhanced features
  switch (tier) {
    case 'basic':
    case 'pro':
    case 'master':
    default:
      return <KitchenBasic />;
  }
}
