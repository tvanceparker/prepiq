import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DishProfitabilityResponse } from '../../../interfaces/analytics';
import { getDishProfitability } from '../../../api/analytics';

const iso = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date();
defaultStart.setDate(today.getDate() - 30);

type SortKey = 'margin' | 'foodCost';

export function useDishProfitability() {
  const [startDate, setStartDate] = useState<string | undefined>(iso(defaultStart));
  const [endDate, setEndDate] = useState<string | undefined>(iso(today));
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('margin');
  const [category, setCategory] = useState<string>('all');

  const query = useQuery<DishProfitabilityResponse>({
    queryKey: ['mobile-dish-profitability', startDate, endDate],
    queryFn: () => getDishProfitability({ start_date: startDate, end_date: endDate }),
    enabled: Boolean(startDate && endDate),
  });

  const data = query.data as DishProfitabilityResponse | undefined;

  const categories = useMemo(() => {
    const base = data?.items || [];
    const unique = new Set<string>();
    base.forEach(item => {
      if (item.category) unique.add(item.category);
    });
    return ['all', ...Array.from(unique).sort()];
  }, [data]);

  const items = useMemo(() => {
    const base = data?.items || [];
    const filtered = base.filter(item => {
      const matchesSearch = search ? item.name.toLowerCase().includes(search.toLowerCase()) : true;
      const matchesCategory = category === 'all' ? true : item.category === category;
      return matchesSearch && matchesCategory;
    });
    return [...filtered].sort((a, b) => {
      if (sortKey === 'margin') return b.gross_margin - a.gross_margin;
      return a.food_cost_pct - b.food_cost_pct;
    });
  }, [data, search, sortKey, category]);

  const summary = useMemo(() => {
    const totalMargin = items.reduce((sum, item) => sum + item.gross_margin, 0);
    const totalFoodCostPct = items.reduce((sum, item) => sum + item.food_cost_pct, 0);
    return {
      avgMargin: items.length ? totalMargin / items.length : 0,
      avgFoodCostPct: items.length ? totalFoodCostPct / items.length : 0,
    };
  }, [items]);

  const bestMargins = useMemo(() => [...items].sort((a, b) => b.gross_margin - a.gross_margin).slice(0, 3), [items]);
  const highestFoodCost = useMemo(() => [...items].sort((a, b) => b.food_cost_pct - a.food_cost_pct).slice(0, 3), [items]);

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
    search,
    setSearch,
    sortKey,
    setSortKey,
    category,
    setCategory,
    query,
    data,
    items,
    summary,
    bestMargins,
    highestFoodCost,
    setQuickRange,
  };
}
