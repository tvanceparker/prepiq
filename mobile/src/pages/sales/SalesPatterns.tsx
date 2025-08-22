import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SalesPatternsBasicMobile from './components/SalesPatternsBasicMobile';

export default function SalesPatterns() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'pro':
    case 'master':
    default:
      return <SalesPatternsBasicMobile />;
  }
}
