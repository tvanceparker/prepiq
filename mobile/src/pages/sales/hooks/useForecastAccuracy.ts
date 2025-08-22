import { useState, useEffect, useMemo } from 'react';
import {
  getForecastAccuracyChart,
  getForecastAccuracyTable,
  getComputedForecastAccuracy,
} from '../../../api/forecast';

export interface ForecastAccuracyPoint {
  menu_item_id: number;
  menu_item_name: string;
  date?: string;
  accuracy?: number;
  predicted?: number;
  actual?: number;
}

export const useForecastAccuracy = (startDate: string, endDate: string) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [computedData, setComputedData] = useState<any[]>([]);
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [chart, table, computed] = await Promise.all([
          getForecastAccuracyChart(startDate, endDate),
          getForecastAccuracyTable(startDate, endDate),
          getComputedForecastAccuracy(startDate, endDate),
        ]);
        setChartData(chart);
        setTableData(table);
        setComputedData(computed);
      } catch (e: any) {
        setError('Failed to load forecast accuracy data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [startDate, endDate]);

  const filteredChartData = useMemo(
    () =>
      selectedMenuItemIds.length
        ? chartData.filter(d => selectedMenuItemIds.includes(d.menu_item_id))
        : chartData,
    [chartData, selectedMenuItemIds]
  );
  const filteredTableData = useMemo(
    () =>
      selectedMenuItemIds.length
        ? tableData.filter(d => selectedMenuItemIds.includes(d.menu_item_id))
        : tableData,
    [tableData, selectedMenuItemIds]
  );
  const filteredComputedData = useMemo(
    () =>
      selectedMenuItemIds.length
        ? computedData.filter(d => selectedMenuItemIds.includes(d.menu_item_id))
        : computedData,
    [computedData, selectedMenuItemIds]
  );

  return {
    filteredChartData,
    filteredTableData,
    filteredComputedData,
    chartData,
    tableData,
    computedData,
    setSelectedMenuItemIds,
    selectedMenuItemIds,
    loading,
    error,
  };
};
