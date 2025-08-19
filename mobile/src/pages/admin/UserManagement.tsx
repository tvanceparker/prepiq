import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import UserManagementBasic from './components/UserManagementBasic';

export default function UserManagement() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'master':
    default:
      return <UserManagementBasic />;
  }
}
