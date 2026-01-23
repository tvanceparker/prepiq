// src/pages/sales/hooks/useSalesPatterns.js
import { useState, useEffect, useCallback } from 'react';
import {
  getSalesOverTimeByItem,
  getSalesHeatmapData,
  getWeekdaySalesAvg,
  getSalesChannelBreakdown,
  getSalesDateRange,
} from '../../../api/forecast';

export function useSalesPatterns() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // Subtract 14 days
    return d.toISOString().slice(0, 10); // yyyy-mm-dd
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [byRevenue, setByRevenue] = useState(false);

  const [salesOverTime, setSalesOverTime] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);
  const [weekdayAvg, setWeekdayAvg] = useState([]);
  const [channelBreakdown, setChannelBreakdown] = useState([]);
  const [normalize, setNormalize] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isActive = true;

    const normalizeDate = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const refreshRange = async () => {
      try {
        const range = await getSalesDateRange();
        if (!isActive || !range?.max_date) return;

        const minDate = range.min_date ? normalizeDate(new Date(range.min_date)) : null;
        const maxDate = normalizeDate(new Date(range.max_date));

        const currentStart = normalizeDate(new Date(startDate));
        const currentEnd = normalizeDate(new Date(endDate));

        const outOfRange = (minDate && currentEnd < minDate) || currentStart > maxDate;
        if (outOfRange) {
          const newEnd = maxDate;
          const newStartCandidate = new Date(maxDate);
          newStartCandidate.setDate(newStartCandidate.getDate() - 7);
          const newStart = minDate && newStartCandidate < minDate ? minDate : newStartCandidate;

          if (isActive) {
            setStartDate(newStart.toISOString().slice(0, 10));
            setEndDate(newEnd.toISOString().slice(0, 10));
          }
        }
      } catch (err) {
        console.error('Failed to load sales date range:', err);
      }
    };

    refreshRange();
    return () => {
      isActive = false;
    };
  }, [startDate, endDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesOverTimeRes, heatmapRes, weekdayAvgRes, channelBreakdownRes] = await Promise.all([
        getSalesOverTimeByItem(startDate, endDate, byRevenue),
        getSalesHeatmapData(startDate, endDate, byRevenue, normalize),
        getWeekdaySalesAvg(startDate, endDate, byRevenue),
        getSalesChannelBreakdown(startDate, endDate, byRevenue),
      ]);
      setSalesOverTime(salesOverTimeRes);
      setHeatmapData(heatmapRes);
      setWeekdayAvg(weekdayAvgRes);
      setChannelBreakdown(channelBreakdownRes);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, byRevenue, normalize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    byRevenue,
    setByRevenue,
    normalize,
    setNormalize,
    salesOverTime,
    heatmapData,
    weekdayAvg,
    channelBreakdown,
    loading,
    error,
  };
}
