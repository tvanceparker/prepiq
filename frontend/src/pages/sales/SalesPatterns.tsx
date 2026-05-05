import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SalesPatternsBasic from './components/SalesPatternsBasic';

export default function SalesPatterns() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case 'basic':
      return <SalesPatternsBasic />;
    default:
      return <SalesPatternsBasic />;
  }
}
