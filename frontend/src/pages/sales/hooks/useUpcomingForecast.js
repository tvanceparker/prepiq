import { useState, useEffect } from 'react';
import {
  getUpcomingForecastTable,
  getUpcomingForecastTotals,
  getTopForecastedItems,
  getForecastState,
} from '../../../api/forecast';

function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function useUpcomingForecast(initialStartDate, initialEndDate, initialMode = 'per_day') {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [mode, setMode] = useState(initialMode);

  const [forecastTable, setForecastTable] = useState([]);
  const [forecastTotals, setForecastTotals] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [forecastState, setForecastState] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchForecast() {
      setLoading(true);
      setError(null);
      try {
        const [table, totals, top, state] = await Promise.all([
          getUpcomingForecastTable(formatDate(startDate), formatDate(endDate)),
          getUpcomingForecastTotals(formatDate(startDate), formatDate(endDate), mode),
          getTopForecastedItems(formatDate(startDate), formatDate(endDate), 5),
          getForecastState(),
        ]);
        setForecastTable(table);
        setForecastTotals(totals);
        setTopItems(top);
        setForecastState(state);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }
    fetchForecast();
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
    forecastState,
    loading,
    error,
  };
}
