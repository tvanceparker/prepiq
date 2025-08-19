import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import MenuMixInsightsBasicMobile from './components/MenuMixInsightsBasicMobile';

export default function MenuMixInsights(){
  const { tier } = useContext(AuthContext);
  switch(tier){
    case 'basic':
    case 'pro':
    case 'master':
    default:
      return <MenuMixInsightsBasicMobile />;
  }
}
