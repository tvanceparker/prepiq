import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import AlertsFeedBasic from './components/AlertsFeedBasic';

export default function AlertsFeed(): JSX.Element {
  const tier = (useContext(AuthContext) as any)?.tier;

  switch (tier) {
    case 'basic':
      return <AlertsFeedBasic />;
    default:
      return <AlertsFeedBasic />;
  }
}
