import React, { useContext } from 'react';
import BasicRestaurantSettingsMobile from './components/BasicRestaurantSettingsMobile';
import ProRestaurantSettingsMobile from './components/ProRestaurantSettingsMobile';
import { AuthContext } from '../../contexts/AuthContext';

export default function RestaurantSettings() {
  const { tier } = useContext(AuthContext);

  if (tier === 'full') return <ProRestaurantSettingsMobile />;
  return <BasicRestaurantSettingsMobile />;
}
