import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import POSBasic from './components/POSBasic';

export default function POS(): JSX.Element | null {
  const tier = (useContext(AuthContext) as any)?.tier;

  switch (tier) {
    case 'basic':
      return <POSBasic />;
    default:
      return <POSBasic />;
  }
}
