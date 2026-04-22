import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import UpcomingForecastBasicMobile from './components/UpcomingForecastBasicMobile';

export default function UpcomingForecast() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'full':
    default:
      return <UpcomingForecastBasicMobile />;
  }
}
