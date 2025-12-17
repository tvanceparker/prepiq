import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  IngredientCostTrendsResponse,
  IngredientCostTrendSeries,
  CostGranularity,
} from '../../../interfaces/analytics';
import { getIngredientCostTrends } from '../../../api/profitAnalytics';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date();
defaultStart.setDate(today.getDate() - 90);

export function useIngredientCostTrends() {
  const [startDate, setStartDate] = useState(iso(defaultStart));
  const [endDate, setEndDate] = useState(iso(today));
  const [granularity, setGranularity] = useState<CostGranularity>('weekly');
  const [ingredientIds, setIngredientIds] = useState<number[]>([]);
  const [supplierIds, setSupplierIds] = useState<number[]>([]);

  const query = useQuery<IngredientCostTrendsResponse>({
    queryKey: [
      'ingredient-cost-trends',
      startDate,
      endDate,
      granularity,
      ingredientIds.join(','),
      supplierIds.join(','),
    ],
    queryFn: () =>
      getIngredientCostTrends({
        start_date: startDate,
        end_date: endDate,
        granularity,
        ingredient_ids: ingredientIds.length ? ingredientIds : undefined,
        supplier_ids: supplierIds.length ? supplierIds : undefined,
      }),
    enabled: Boolean(startDate && endDate),
  });

  const data = query.data as IngredientCostTrendsResponse | undefined;

  const availableIngredients = useMemo(() => {
    const seen = new Map<number, string>();
    (data?.series || []).forEach(series => {
      if (!seen.has(series.ingredient_id)) {
        seen.set(series.ingredient_id, series.ingredient_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [query.data]);

  const availableSuppliers = useMemo(() => {
    const seen = new Map<number, string>();
    (data?.series || []).forEach(series => {
      if (series.supplier_id && series.supplier_name) {
        seen.set(series.supplier_id, series.supplier_name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [query.data]);

  const selectedSeries: IngredientCostTrendSeries[] = useMemo(() => {
    const base = data?.series || [];
    if (ingredientIds.length === 0) {
      return base.slice(0, 6); // top 6 by default to avoid noisy charts
    }
    const allowed = new Set(ingredientIds);
    return base.filter(s => allowed.has(s.ingredient_id));
  }, [ingredientIds, query.data]);

  const labeledSeries = useMemo(
    () =>
      selectedSeries.map(series => ({
        ...series,
        label: `${series.ingredient_name}${series.supplier_name ? ` (${series.supplier_name})` : ''}`,
      })),
    [selectedSeries]
  );

  const chartData = useMemo(() => {
    type ChartRow = { bucket_start: string; [key: string]: number | string };
    const bucketMap: Record<string, ChartRow> = {};

    labeledSeries.forEach(series => {
      series.points.forEach(point => {
        if (!bucketMap[point.bucket_start]) {
          bucketMap[point.bucket_start] = { bucket_start: point.bucket_start };
        }
        bucketMap[point.bucket_start][series.label] = point.total_cost;
      });
    });

    return Object.values(bucketMap).sort((a, b) =>
      String(a.bucket_start).localeCompare(String(b.bucket_start))
    );
  }, [labeledSeries]);

  const topMovers = useMemo(() => {
    const computeChange = (series: IngredientCostTrendSeries) => {
      const points = series.points;
      if (points.length < 2) return 0;
      const firstCost = points[0].total_cost;
      const lastCost = points[points.length - 1].total_cost;
      if (!firstCost) return 0;
      return ((lastCost - firstCost) / firstCost) * 100;
    };

    return (data?.series || [])
      .map(series => ({
        id: series.ingredient_id,
        name: series.ingredient_name,
        changePct: computeChange(series),
        supplier: series.supplier_name,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 3);
  }, [query.data]);

  const setQuickRangeDays = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(iso(start));
    setEndDate(iso(end));
  };

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    granularity,
    setGranularity,
    ingredientIds,
    setIngredientIds,
    supplierIds,
    setSupplierIds,
    query,
    chartData,
    labeledSeries,
    availableIngredients,
    availableSuppliers,
    topMovers,
    setQuickRangeDays,
  };
}
