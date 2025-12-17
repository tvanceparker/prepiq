import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { WasteAnalyticsResponse, WasteInsight } from '../../../interfaces/analytics';
import { getWasteAnalytics } from '../../../api/wasteAnalytics';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date();
defaultStart.setDate(today.getDate() - 30);

export function useWasteDashboard() {
  const [startDate, setStartDate] = useState<string>(iso(defaultStart));
  const [endDate, setEndDate] = useState<string>(iso(today));
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const query = useQuery<WasteAnalyticsResponse>({
    queryKey: ['waste-analytics', startDate, endDate],
    queryFn: () => getWasteAnalytics({ start_date: startDate, end_date: endDate }),
    enabled: Boolean(startDate && endDate),
  });

  const data = query.data;

  const filteredTrend = useMemo(() => {
    if (!data) return [];
    if (typeFilter === 'all') return data.trend;
    // If filtering by type, scale trend by type contribution ratios
    const typeEntry = data.by_type.find(b => b.usage_type === typeFilter);
    if (!typeEntry) return data.trend;
    const ratio =
      typeEntry.total_cost && data.total_waste_cost
        ? typeEntry.total_cost / data.total_waste_cost
        : 0;
    return data.trend.map(p => ({
      ...p,
      total_cost: p.total_cost * ratio,
      total_quantity: p.total_quantity * ratio,
    }));
  }, [data, typeFilter]);

  const topInsights = useMemo<WasteInsight[]>(() => data?.insights ?? [], [data]);

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
    data,
    filteredTrend,
    topInsights,
    setQuickRange,
  };
}
