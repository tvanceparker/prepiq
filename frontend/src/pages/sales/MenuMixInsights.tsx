/**
 * Menu Mix Insights - Tier Router
 * Routes to appropriate component based on subscription tier
 */

import React, { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import MenuMixInsightsBasic from './components/MenuMixInsightsBasic';
import MenuMixInsightsPro from './components/MenuMixInsightsPro';
// import MenuMixInsightsMaster from "./components/MenuMixInsightsMaster"; // TODO: Implement Master tier

export default function MenuMixInsights() {
  const { tier } = useContext(AuthContext);

  switch (tier) {
    case 'basic':
      return <MenuMixInsightsBasic />;
    case 'full':
      return <MenuMixInsightsPro />; // Fallback to Pro for now
    default:
      return <MenuMixInsightsBasic />;
  }
}
