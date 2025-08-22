import { useState, useEffect } from 'react';
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
  const [forecastTable, setForecastTable] = useState<any[]>([]);
  const [forecastTotals, setForecastTotals] = useState<any>(null);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [table, totals, top] = await Promise.all([
          getUpcomingForecastTable(fmt(startDate), fmt(endDate)),
          getUpcomingForecastTotals(fmt(startDate), fmt(endDate), mode),
          getTopForecastedItems(fmt(startDate), fmt(endDate), 5),
        ]);
        setForecastTable(table);
        setForecastTotals(totals);
        setTopItems(top);
      } catch (e: any) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [startDate, endDate, mode]);
  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    mode,
    setMode,
    forecastTable,
    forecastTotals,
    topItems,
    loading,
    error,
  };
}
