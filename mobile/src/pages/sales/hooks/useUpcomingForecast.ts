import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getUpcomingForecastTable,
  getUpcomingForecastTotals,
  getTopForecastedItems,
} from '../../../api/forecast';

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useUpcomingForecast(
  initialStart: Date,
  initialEnd: Date,
  initialMode: 'per_day' | 'total' = 'per_day'
) {
  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);
  const [mode, setMode] = useState<'per_day' | 'total'>(initialMode);

  const {
    data: forecastTable = [],
    isLoading: tableLoading,
    error: tableError,
  } = useQuery({
    queryKey: ['upcomingForecast', 'table', fmt(startDate), fmt(endDate)],
    queryFn: () => getUpcomingForecastTable(fmt(startDate), fmt(endDate)),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: forecastTotals = null,
    isLoading: totalsLoading,
    error: totalsError,
  } = useQuery({
    queryKey: ['upcomingForecast', 'totals', fmt(startDate), fmt(endDate), mode],
    queryFn: () => getUpcomingForecastTotals(fmt(startDate), fmt(endDate), mode),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: topItems = [],
    isLoading: topLoading,
    error: topError,
  } = useQuery({
    queryKey: ['upcomingForecast', 'topItems', fmt(startDate), fmt(endDate)],
    queryFn: () => getTopForecastedItems(fmt(startDate), fmt(endDate), 5),
    enabled: !!startDate && !!endDate,
  });

  const loading = tableLoading || totalsLoading || topLoading;
  const error = tableError || totalsError || topError || null;

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    mode,
    setMode,
    forecastTable: forecastTable || [],
    forecastTotals: forecastTotals || null,
    topItems: topItems || [],
    loading,
    error,
  };
}
