import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import AlertsFeedBasicMobile from './components/AlertsFeedBasicMobile';

export default function AlertsFeed() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'pro':
    case 'master':
    default:
      return <AlertsFeedBasicMobile />;
  }
}
