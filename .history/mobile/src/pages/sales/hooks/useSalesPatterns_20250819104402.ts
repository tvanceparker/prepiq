import { useState, useEffect, useCallback } from 'react';
import { getSalesOverTimeByItem, getSalesHeatmapData, getWeekdaySalesAvg, getSalesChannelBreakdown } from '../../../api/forecast';

export function useSalesPatterns(){
  const [startDate,setStartDate] = useState(()=> { const d=new Date(); d.setDate(d.getDate()-14); return d.toISOString().slice(0,10); });
  const [endDate,setEndDate] = useState(()=> new Date().toISOString().slice(0,10));
  const [byRevenue,setByRevenue] = useState(false);
  const [salesOverTime,setSalesOverTime] = useState<any[]>([]);
  const [heatmapData,setHeatmapData] = useState<any>(null);
  const [weekdayAvg,setWeekdayAvg] = useState<any[]>([]);
  const [channelBreakdown,setChannelBreakdown] = useState<any[]>([]);
  const [normalize,setNormalize] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<any>(null);

  const fetchData = useCallback(async () => { setLoading(true); setError(null); try { const [overTime, heatmap, weekday, channel] = await Promise.all([
    getSalesOverTimeByItem(startDate,endDate,byRevenue),
    getSalesHeatmapData(startDate,endDate,byRevenue,normalize),
    getWeekdaySalesAvg(startDate,endDate,byRevenue),
    getSalesChannelBreakdown(startDate,endDate,byRevenue),
  ]); setSalesOverTime(overTime); setHeatmapData(heatmap); setWeekdayAvg(weekday); setChannelBreakdown(channel); } catch(e){ setError(e); } finally { setLoading(false);} },[startDate,endDate,byRevenue,normalize]);

  useEffect(()=> { fetchData(); },[fetchData]);

  return { startDate,setStartDate,endDate,setEndDate,byRevenue,setByRevenue,normalize,setNormalize,salesOverTime,heatmapData,weekdayAvg,channelBreakdown,loading,error };
}
