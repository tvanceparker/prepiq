import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import TenantInfoBasic from './components/TenantInfoBasic';

export default function TenantInfo() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'master':
    default:
      return <TenantInfoBasic />;
  }
}
