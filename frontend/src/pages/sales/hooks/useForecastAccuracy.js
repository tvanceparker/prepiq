import { useState, useEffect, useMemo } from 'react';
import {
  getForecastAccuracyChart,
  getForecastAccuracyTable,
  getComputedForecastAccuracy,
  getForecastState,
} from '../../../api/forecast';

export const useForecastAccuracy = (startDate, endDate) => {
  const [chartData, setChartData] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [computedData, setComputedData] = useState([]);
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState([]);
  const [forecastState, setForecastState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [chart, table, computed, state] = await Promise.all([
          getForecastAccuracyChart(startDate, endDate),
          getForecastAccuracyTable(startDate, endDate),
          getComputedForecastAccuracy(startDate, endDate),
          getForecastState(),
        ]);
        setChartData(chart);
        setTableData(table);
        setComputedData(computed);
        setForecastState(state);
      } catch (err) {
        console.error(err);
        setError('Failed to load forecast accuracy data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Filter data by selected menu items
  const filteredChartData = useMemo(() => {
    return selectedMenuItemIds.length
      ? chartData.filter(d => selectedMenuItemIds.includes(d.menu_item_id))
      : chartData;
  }, [chartData, selectedMenuItemIds]);

  const filteredTableData = useMemo(() => {
    return selectedMenuItemIds.length
      ? tableData.filter(d => selectedMenuItemIds.includes(d.menu_item_id))
      : tableData;
  }, [tableData, selectedMenuItemIds]);

  const filteredComputedData = useMemo(() => {
    return selectedMenuItemIds.length
      ? computedData.filter(d => selectedMenuItemIds.includes(d.menu_item_id))
      : computedData;
  }, [computedData, selectedMenuItemIds]);

  return {
    filteredChartData,
    filteredTableData,
    filteredComputedData,
    chartData, // ← add
    tableData, // ← add
    computedData, // ← add
    forecastState,
    setSelectedMenuItemIds,
    selectedMenuItemIds,
    loading,
    error,
  };
};
