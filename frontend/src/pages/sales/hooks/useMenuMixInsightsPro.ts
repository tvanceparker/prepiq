/**
 * Custom hook for Pro tier Menu Mix Insights
 * Fetches sales data with cost analysis and profitability metrics
 */

import { useState, useEffect } from 'react';
import {
  getSalesBreakdownPro,
  getSalesOverTimePro,
  getTopBottomItemsPro,
} from '../../../api/forecast';
import {
  MenuItemCostInsight,
  SalesOverTimeProItem,
  TopBottomProItem,
} from '../../../interfaces/forecast';

interface UseMenuMixInsightsProReturn {
  breakdownData: MenuItemCostInsight[];
  overTimeData: SalesOverTimeProItem[];
  topBottomData: TopBottomProItem[];
  topView: boolean;
  setTopView: (value: boolean) => void;
  loading: boolean;
  selectedMenuItemIds: number[];
  setSelectedMenuItemIds: (ids: number[]) => void;
}

export default function useMenuMixInsightsPro(
  startDate: string,
  endDate: string,
  byRevenue: boolean
): UseMenuMixInsightsProReturn {
  const [topView, setTopView] = useState(true);
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<number[]>([]);
  const [breakdownData, setBreakdownData] = useState<MenuItemCostInsight[]>([]);
  const [overTimeData, setOverTimeData] = useState<SalesOverTimeProItem[]>([]);
  const [topBottomData, setTopBottomData] = useState<TopBottomProItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [breakdown, overTime, topBottom] = await Promise.all([
          getSalesBreakdownPro(startDate, endDate, byRevenue),
          getSalesOverTimePro(startDate, endDate, byRevenue),
          getTopBottomItemsPro(startDate, endDate, byRevenue, topView, 10),
        ]);

        setBreakdownData(breakdown);
        setOverTimeData(overTime);
        setTopBottomData(topBottom);
      } catch (err) {
        console.error('Error loading Pro tier menu mix insights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, byRevenue, topView]);

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
