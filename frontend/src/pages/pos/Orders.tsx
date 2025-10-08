import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import OrdersBasic from './components/OrdersBasic';

export default function Orders(): JSX.Element | null {
  const tier = (useContext(AuthContext) as any)?.tier;

  switch (tier) {
    case 'basic':
      return <OrdersBasic />;
    default:
      return <OrdersBasic />;
  }
}
