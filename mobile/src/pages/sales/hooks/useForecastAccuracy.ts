import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getForecastAccuracyChart,
  getForecastAccuracyTable,
  getComputedForecastAccuracy,
  getForecastState,
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
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<number[]>([]);

  const {
    data: chartData = [],
    isLoading: chartLoading,
    error: chartError,
  } = useQuery({
    queryKey: ['forecastAccuracy', 'chart', startDate, endDate],
    queryFn: () => getForecastAccuracyChart(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: tableData = [],
    isLoading: tableLoading,
    error: tableError,
  } = useQuery({
    queryKey: ['forecastAccuracy', 'table', startDate, endDate],
    queryFn: () => getForecastAccuracyTable(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: computedData = [],
    isLoading: computedLoading,
    error: computedError,
  } = useQuery({
    queryKey: ['forecastAccuracy', 'computed', startDate, endDate],
    queryFn: () => getComputedForecastAccuracy(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });

  const {
    data: forecastState = null,
    isLoading: stateLoading,
    error: stateError,
  } = useQuery({
    queryKey: ['forecastState'],
    queryFn: () => getForecastState(),
  });

  const loading = chartLoading || tableLoading || computedLoading || stateLoading;
  const error = chartError || tableError || computedError || stateError || null;

  const filteredChartData = useMemo(
    () =>
      selectedMenuItemIds.length
        ? chartData.filter((d: any) => selectedMenuItemIds.includes(d.menu_item_id))
        : chartData,
    [chartData, selectedMenuItemIds]
  );

  const filteredTableData = useMemo(
    () =>
      selectedMenuItemIds.length
        ? tableData.filter((d: any) => selectedMenuItemIds.includes(d.menu_item_id))
        : tableData,
    [tableData, selectedMenuItemIds]
  );

  const filteredComputedData = useMemo(
    () =>
      selectedMenuItemIds.length
        ? computedData.filter((d: any) => selectedMenuItemIds.includes(d.menu_item_id))
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
    forecastState,
    setSelectedMenuItemIds,
    selectedMenuItemIds,
    loading,
    error,
  };
};
