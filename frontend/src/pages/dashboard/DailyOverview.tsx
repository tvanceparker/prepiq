import React from 'react';
import BasicOverview from './components/BasicOverview';
import { useDailyOverview } from './hooks/useDailyOverview';

export default function DailyOverview(): JSX.Element {
  const { data, loading, error } = useDailyOverview();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading overview: {String(error)}</div>;

  return <BasicOverview data={data} />;
}
