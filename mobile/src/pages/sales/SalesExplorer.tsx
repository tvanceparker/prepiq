import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SalesExplorerBasicMobile from './components/SalesExplorerBasicMobile';

export default function SalesExplorer() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'pro':
    case 'master':
    default:
      return <SalesExplorerBasicMobile />;
  }
}
