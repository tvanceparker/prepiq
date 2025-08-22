import { useState, useEffect, useCallback } from 'react';
import { getSalesOverTimeByItem, getSalesHeatmapData, getWeekdaySalesAvg, getSalesChannelBreakdown } from '../../../api/forecast';

export function useSalesPatterns(){
  const [startDate,setStartDate] = useState(()=> { const d=new Date(); d.setDate(d.getDate()-14); return d.toISOString().slice(0,10); });
  const [endDate,setEndDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [byRevenue,setByRevenue] = useState(false);
  const [salesOverTime,setSalesOverTime] = useState<any[]>([]);
  const [heatmapData,setHeatmapData] = useState<any>([]);
  const [weekdayAvg,setWeekdayAvg] = useState<any[]>([]);
  const [channelBreakdown,setChannelBreakdown] = useState<any[]>([]);
  const [normalize,setNormalize] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useSalesPatterns] fetching patterns', { startDate, endDate, byRevenue, normalize });
      const [overTime, heatmap, weekday, channel] = await Promise.all([
        getSalesOverTimeByItem(startDate, endDate, byRevenue),
        getSalesHeatmapData(startDate, endDate, byRevenue, normalize),
        getWeekdaySalesAvg(startDate, endDate, byRevenue),
        getSalesChannelBreakdown(startDate, endDate, byRevenue),
      ]);
      console.log('[useSalesPatterns] responses', {
        overTime: Array.isArray(overTime) ? overTime.length : typeof overTime,
        heatmap: Array.isArray(heatmap) ? heatmap.length : typeof heatmap,
        weekday: Array.isArray(weekday) ? weekday.length : typeof weekday,
        channel: Array.isArray(channel) ? channel.length : typeof channel,
      });
      setSalesOverTime(overTime || []);
      setHeatmapData(heatmap || []);
      setWeekdayAvg(weekday || []);
      setChannelBreakdown(channel || []);
    } catch (e: any) {
      console.error('[useSalesPatterns] fetch error', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, byRevenue, normalize]);

  useEffect(()=> { fetchData(); },[fetchData]);

  // expose a manual refresh helper if the consumer wants to force a reload
  const refresh = fetchData;

  return { startDate,setStartDate,endDate,setEndDate,byRevenue,setByRevenue,normalize,setNormalize,salesOverTime,heatmapData,weekdayAvg,channelBreakdown,loading,error,refresh };
}
