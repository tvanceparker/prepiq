import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import KitchenBasic from './components/KitchenBasic';

export default function Kitchen(): JSX.Element | null {
  const tier = (useContext(AuthContext) as any)?.tier;

  switch (tier) {
    case 'basic':
      return <KitchenBasic />;
    default:
      return <KitchenBasic />;
  }
}
