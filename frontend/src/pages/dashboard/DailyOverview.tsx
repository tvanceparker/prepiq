import React, { useContext } from 'react';
import BasicOverview from './components/BasicOverview';
import { useDailyOverview } from './hooks/useDailyOverview';
import { AuthContext } from '../../contexts/AuthContext';
import ProOverview from './components/ProOverview';
import MasterOverview from './components/MasterOverview';

export default function DailyOverview(): JSX.Element | null {
  const tier = (useContext(AuthContext) as any)?.tier;
  const { data, loading, error } = useDailyOverview();

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p>Error loading dashboard: {(error as any).message}</p>;

  switch (tier) {
    case 'basic':
      return <BasicOverview data={data} />;
    case 'pro':
      return <ProOverview data={data} />;
    case 'master':
      return <MasterOverview data={data} />;
    default:
      return <BasicOverview data={data} />;
  }
}
