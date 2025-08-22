import { useState, useEffect, useCallback } from 'react';
import {
  getSalesOverTimeByItem,
  getSalesHeatmapData,
  getWeekdaySalesAvg,
  getSalesChannelBreakdown,
} from '../../../api/forecast';

export function useSalesPatterns() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [byRevenue, setByRevenue] = useState(false);
  const [salesOverTime, setSalesOverTime] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any>([]);
  const [weekdayAvg, setWeekdayAvg] = useState<any[]>([]);
  const [channelBreakdown, setChannelBreakdown] = useState<any[]>([]);
  const [normalize, setNormalize] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useSalesPatterns] fetching patterns', {
        startDate,
        endDate,
        byRevenue,
        normalize,
      });
      const [overTime, heatmap, weekday, channel] = await Promise.all([
        getSalesOverTimeByItem(startDate, endDate, byRevenue),
        getSalesHeatmapData(startDate, endDate, byRevenue, normalize),
        getWeekdaySalesAvg(startDate, endDate, byRevenue),
        getSalesChannelBreakdown(startDate, endDate, byRevenue),
      ]);
      console.log('[useSalesPatterns] raw responses', {
        overTime: Array.isArray(overTime) ? overTime.length : typeof overTime,
        heatmap: heatmap && typeof heatmap === 'object' ? Object.keys(heatmap).length : (Array.isArray(heatmap) ? heatmap.length : typeof heatmap),
        weekday: Array.isArray(weekday) ? weekday.length : typeof weekday,
        channel: Array.isArray(channel) ? channel.length : typeof channel,
      });

      // Normalize salesOverTime: backend returns { date, menu_item_id, menu_item_name, value }
      const normalizedOverTime = Array.isArray(overTime)
        ? overTime.map((r: any) => ({
            sale_date: r.date || r.sale_timestamp || r.sale_date,
            menu_item_id: r.menu_item_id,
            menu_item_name: r.menu_item_name || r.menu_item_name || r.name,
            metric: r.value ?? r.metric ?? r.count ?? 0,
          }))
        : [];

      // Normalize heatmap: backend may return an object { overall:[], by_menu_item: [] }
      let normalizedHeatmap: any[] = [];
      if (heatmap) {
        if (Array.isArray(heatmap)) {
          // some older endpoints might return flat array
          normalizedHeatmap = heatmap.map((r: any) => ({ menu_item_name: r.menu_item_name || r.name, metric: r.value ?? r.metric ?? 0 }));
        } else if (typeof heatmap === 'object') {
          const byMenu = Array.isArray(heatmap.by_menu_item) ? heatmap.by_menu_item : [];
          // aggregate values per menu_item
          const agg: Record<string, number> = {};
          const names: Record<string, string> = {};
          for (const e of byMenu) {
            const id = e.menu_item_id ?? e.menu_item_id;
            const name = e.menu_item_name ?? e.menu_item_name ?? e.name ?? String(id);
            const v = Number(e.value ?? e.normalized_value ?? e.metric ?? 0) || 0;
            agg[id] = (agg[id] || 0) + v;
            names[id] = name;
          }
          normalizedHeatmap = Object.keys(agg).map(id => ({ menu_item_id: id, menu_item_name: names[id], metric: agg[id] }));
          // sort descending
          normalizedHeatmap.sort((a, b) => b.metric - a.metric);
        }
      }

      // Normalize weekday: backend returns { weekday, average_value }
      const normalizedWeekday = Array.isArray(weekday)
        ? weekday.map((r: any) => ({ weekday: r.weekday, metric: r.average_value ?? r.metric ?? 0 }))
        : [];

      // Normalize channel breakdown: backend returns { sales_channel, value }
      const normalizedChannel = Array.isArray(channel)
        ? channel.map((r: any) => ({ sales_channel: r.sales_channel ?? r.channel, metric: r.value ?? r.metric ?? 0 }))
        : [];

      setSalesOverTime(normalizedOverTime);
      setHeatmapData(normalizedHeatmap);
      setWeekdayAvg(normalizedWeekday);
      setChannelBreakdown(normalizedChannel);
    } catch (e: any) {
      console.error('[useSalesPatterns] fetch error', e);
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, byRevenue, normalize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // expose a manual refresh helper if the consumer wants to force a reload
  const refresh = fetchData;

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
    refresh,
  };
}
