import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSalesBreakdown, getSalesOverTime, getTopBottomItems } from '../../../api/forecast';

export default function useMenuMixInsights(
  startDate: string,
  endDate: string,
  byRevenue: boolean,
  topCount: number = 10
) {
  const [topView, setTopView] = useState(true);
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<number[]>([]);

  const { data: breakdownRaw = [], isLoading: breakdownLoading } = useQuery({
    queryKey: ['menuMix', 'breakdown', startDate, endDate, byRevenue],
    queryFn: () => getSalesBreakdown(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  const { data: overTimeRaw = [], isLoading: overTimeLoading } = useQuery({
    queryKey: ['menuMix', 'overTime', startDate, endDate, byRevenue],
    queryFn: () => getSalesOverTime(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  const { data: topBottomRaw = [], isLoading: topBottomLoading } = useQuery({
    queryKey: ['menuMix', 'topBottom', startDate, endDate, byRevenue, topView, topCount],
    queryFn: () => getTopBottomItems(startDate, endDate, byRevenue, topView, topCount),
    enabled: !!startDate && !!endDate,
  });

  // Transform Full tier breakdown data to have metric field
  const breakdownData = useMemo(() => {
    return (Array.isArray(breakdownRaw) ? breakdownRaw : []).map((item: any) => ({
      ...item,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      // Use revenue for revenue mode, quantity_sold for quantity mode
      metric: byRevenue ? Number(item.revenue) : Number(item.quantity_sold),
    }));
  }, [breakdownRaw, byRevenue]);

  // Transform Full tier over time data to have metric field and sale_date
  const overTimeData = useMemo(() => {
    return (Array.isArray(overTimeRaw) ? overTimeRaw : []).map((item: any) => ({
      ...item,
      sale_date: item.sale_date,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      // Use revenue for revenue mode, quantity for quantity mode
      metric: byRevenue ? Number(item.revenue) : Number(item.quantity),
    }));
  }, [overTimeRaw, byRevenue]);

  // Transform Full tier top/bottom data to have metric field
  const topBottomData = useMemo(() => {
    return (Array.isArray(topBottomRaw) ? topBottomRaw : []).map((item: any) => ({
      ...item,
      menu_item_id: item.menu_item_id,
      menu_item_name: item.menu_item_name,
      // Use revenue for revenue mode, quantity_sold for quantity mode
      metric: byRevenue ? Number(item.revenue) : Number(item.quantity_sold),
    }));
  }, [topBottomRaw, byRevenue]);

  const loading = breakdownLoading || overTimeLoading || topBottomLoading;

  return {
    breakdownData,
    overTimeData,
    topBottomData,
    topView,
    setTopView,
    loading,
    selectedMenuItemIds,
    setSelectedMenuItemIds,
  };
}
