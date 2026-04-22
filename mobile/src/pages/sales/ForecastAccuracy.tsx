import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import ForecastAccuracyBasicMobile from './components/ForecastAccuracyBasicMobile';

export default function ForecastAccuracy() {
  const { tier } = useContext(AuthContext);
  switch (tier) {
    case 'basic':
    case 'full':
    default:
      return <ForecastAccuracyBasicMobile />;
  }
}
