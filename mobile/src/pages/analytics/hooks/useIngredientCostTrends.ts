import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CostGranularity, IngredientCostTrendsResponse } from '../../../interfaces/analytics';
import { getIngredientCostTrends } from '../../../api/analytics';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date();
defaultStart.setDate(today.getDate() - 90);

export function useIngredientCostTrends() {
  const [startDate, setStartDate] = useState(iso(defaultStart));
  const [endDate, setEndDate] = useState(iso(today));
  const [granularity, setGranularity] = useState<CostGranularity>('weekly');

  const query = useQuery<IngredientCostTrendsResponse>({
    queryKey: ['mobile-ingredient-cost-trends', startDate, endDate, granularity],
    queryFn: () =>
      getIngredientCostTrends({
        start_date: startDate,
        end_date: endDate,
        granularity,
      }),
    enabled: Boolean(startDate && endDate),
  });

  const data = query.data as IngredientCostTrendsResponse | undefined;

  const labeledSeries = useMemo(
    () =>
      (data?.series || []).map(series => ({
        ...series,
        label: `${series.ingredient_name}${
          series.supplier_name ? ` (${series.supplier_name})` : ''
        }`,
      })),
    [data]
  );

  const plotSeries = useMemo(
    () =>
      labeledSeries.map(series => ({
        label: series.label,
        data: series.points.map(point => ({ x: point.bucket_start, y: point.total_cost })),
      })),
    [labeledSeries]
  );

  const topMovers = useMemo(() => {
    const computeChange = (costs: number[]) => {
      if (costs.length < 2) return 0;
      const first = costs[0];
      const last = costs[costs.length - 1];
      if (!first) return 0;
      return ((last - first) / first) * 100;
    };

    return labeledSeries
      .map(series => ({
        id: series.ingredient_id,
        name: series.label,
        changePct: computeChange(series.points.map(p => p.total_cost)),
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 3);
  }, [labeledSeries]);

  const setQuickRange = (days: number) => {
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
    query,
    labeledSeries,
    plotSeries,
    topMovers,
    setQuickRange,
  };
}
