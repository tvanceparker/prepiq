// src/pages/settings/RestaurantSettings.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import BasicRestaurantSettings from './components/BasicRestaurantSettings';
import ProRestaurantSettings from './components/ProRestaurantSettings';

export default function RestaurantSettings() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case 'basic':
      return <BasicRestaurantSettings />;
    case 'pro':
    case 'master':
      return <ProRestaurantSettings />;
    default:
      return <BasicRestaurantSettings />;
  }
}
