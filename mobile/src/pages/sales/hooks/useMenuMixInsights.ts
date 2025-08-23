import { useState } from 'react';
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

  const { data: breakdownData = [], isLoading: breakdownLoading } = useQuery({
    queryKey: ['menuMix', 'breakdown', startDate, endDate, byRevenue],
    queryFn: () => getSalesBreakdown(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  const { data: overTimeData = [], isLoading: overTimeLoading } = useQuery({
    queryKey: ['menuMix', 'overTime', startDate, endDate, byRevenue],
    queryFn: () => getSalesOverTime(startDate, endDate, byRevenue),
    enabled: !!startDate && !!endDate,
  });

  const { data: topBottomData = [], isLoading: topBottomLoading } = useQuery({
    queryKey: ['menuMix', 'topBottom', startDate, endDate, byRevenue, topView, topCount],
    queryFn: () => getTopBottomItems(startDate, endDate, byRevenue, topView, topCount),
    enabled: !!startDate && !!endDate,
  });

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
