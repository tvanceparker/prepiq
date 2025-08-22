import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import RolesPermissionsBasic from './components/RolesPermissionsBasic';

export default function RolesAccess() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'master':
    default:
      return <RolesPermissionsBasic />;
  }
}
