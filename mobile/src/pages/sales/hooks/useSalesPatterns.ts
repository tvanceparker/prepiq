import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [normalize, setNormalize] = useState(false);

  const {
    data: salesOverTime = [],
    isLoading: overTimeLoading,
    error: overTimeError,
    refetch: refetchOverTime,
  } = useQuery({
    queryKey: ['salesPatterns', 'overTime', startDate, endDate, byRevenue],
    queryFn: () => getSalesOverTimeByItem(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: heatmapRaw = [],
    isLoading: heatmapLoading,
    error: heatmapError,
    refetch: refetchHeatmap,
  } = useQuery({
    queryKey: ['salesPatterns', 'heatmap', startDate, endDate, byRevenue, normalize],
    queryFn: () => getSalesHeatmapData(startDate, endDate, byRevenue, normalize),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: weekdayRaw = [],
    isLoading: weekdayLoading,
    error: weekdayError,
    refetch: refetchWeekday,
  } = useQuery({
    queryKey: ['salesPatterns', 'weekday', startDate, endDate, byRevenue],
    queryFn: () => getWeekdaySalesAvg(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: channelRaw = [],
    isLoading: channelLoading,
    error: channelError,
    refetch: refetchChannel,
  } = useQuery({
    queryKey: ['salesPatterns', 'channel', startDate, endDate, byRevenue],
    queryFn: () => getSalesChannelBreakdown(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  // Normalization/shape adjustments kept from previous implementation
  const salesOverTimeNormalized = Array.isArray(salesOverTime)
    ? salesOverTime.map((r: any) => ({
        sale_date: r.date || r.sale_timestamp || r.sale_date,
        menu_item_id: r.menu_item_id,
        menu_item_name: r.menu_item_name || r.name,
        metric: r.value ?? r.metric ?? r.count ?? 0,
      }))
    : [];

  let normalizedHeatmap: any[] = [];
  if (heatmapRaw) {
    if (Array.isArray(heatmapRaw)) {
      normalizedHeatmap = heatmapRaw.map((r: any) => ({
        menu_item_name: r.menu_item_name || r.name,
        metric: r.value ?? r.metric ?? 0,
      }));
    } else if (typeof heatmapRaw === 'object') {
      const byMenu = Array.isArray(heatmapRaw.by_menu_item) ? heatmapRaw.by_menu_item : [];
      const agg: Record<string, number> = {};
      const names: Record<string, string> = {};
      for (const e of byMenu) {
        const id = e.menu_item_id ?? e.menu_item_id;
        const name = e.menu_item_name ?? e.name ?? String(id);
        const v = Number(e.value ?? e.normalized_value ?? e.metric ?? 0) || 0;
        agg[id] = (agg[id] || 0) + v;
        names[id] = name;
      }
      normalizedHeatmap = Object.keys(agg).map(id => ({
        menu_item_id: id,
        menu_item_name: names[id],
        metric: agg[id],
      }));
      normalizedHeatmap.sort((a, b) => b.metric - a.metric);
    }
  }

  const normalizedWeekday = Array.isArray(weekdayRaw)
    ? weekdayRaw.map((r: any) => ({ weekday: r.weekday, metric: r.average_value ?? r.metric ?? 0 }))
    : [];

  const normalizedChannel = Array.isArray(channelRaw)
    ? channelRaw.map((r: any) => ({
        sales_channel: r.sales_channel ?? r.channel,
        metric: r.value ?? r.metric ?? 0,
      }))
    : [];

  const loading = overTimeLoading || heatmapLoading || weekdayLoading || channelLoading;
  const error = overTimeError || heatmapError || weekdayError || channelError || null;

  const refresh = async () => {
    await Promise.all([refetchOverTime(), refetchHeatmap(), refetchWeekday(), refetchChannel()]);
  };

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    byRevenue,
    setByRevenue,
    normalize,
    setNormalize,
    salesOverTime: salesOverTimeNormalized,
    heatmapData: normalizedHeatmap,
    weekdayAvg: normalizedWeekday,
    channelBreakdown: normalizedChannel,
    loading,
    error,
    refresh,
  };
}
