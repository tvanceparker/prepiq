import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WasteAnalyticsResponse } from '../../../interfaces/analytics';
import { getWasteAnalytics } from '../../../api/wasteAnalytics';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date();
defaultStart.setDate(today.getDate() - 30);

export function useInsightsOptimization() {
  const [startDate, setStartDate] = useState<string>(iso(defaultStart));
  const [endDate, setEndDate] = useState<string>(iso(today));
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const query = useQuery<WasteAnalyticsResponse>({
    queryKey: ['insights-optimization', startDate, endDate],
    queryFn: () => getWasteAnalytics({ start_date: startDate, end_date: endDate }),
    enabled: Boolean(startDate && endDate),
  });

  const insights = query.data?.insights || [];

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(iso(start));
    setEndDate(iso(end));
  };

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    typeFilter,
    setTypeFilter,
    query,
    insights,
    setQuickRange,
  };
}
