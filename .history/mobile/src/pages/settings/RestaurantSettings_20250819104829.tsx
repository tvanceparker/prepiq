import React from 'react';
import BasicRestaurantSettingsMobile from './components/BasicRestaurantSettingsMobile';
import { AuthContext } from '../../contexts/AuthContext';

export default function RestaurantSettings() {
  // could branch by tier later using useContext(AuthContext)
  return <BasicRestaurantSettingsMobile />;
}
