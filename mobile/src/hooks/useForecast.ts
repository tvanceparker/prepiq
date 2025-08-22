import { useQuery } from '@tanstack/react-query';
import {
  getUpcomingForecastTable,
  getUpcomingForecastTotals,
  getSalesBreakdown,
} from '../api/forecast';
import { ForecastItemRow, ForecastTotals, SalesBreakdownEntry } from '../interfaces/forecast';
import { formatDateISO } from '../utils';

interface DateRange {
  start: Date;
  end: Date;
}

export function useForecastTable(range: DateRange) {
  const start = formatDateISO(range.start);
  const end = formatDateISO(range.end);
  return useQuery<ForecastItemRow[]>({
    queryKey: ['forecast', 'table', start, end],
    queryFn: async () => (await getUpcomingForecastTable(start, end)).data,
  });
}

export function useForecastTotals(range: DateRange) {
  const start = formatDateISO(range.start);
  const end = formatDateISO(range.end);
  return useQuery<ForecastTotals>({
    queryKey: ['forecast', 'totals', start, end],
    queryFn: async () => (await getUpcomingForecastTotals(start, end)).data,
  });
}

export function useSalesBreakdown(range: DateRange) {
  const start = formatDateISO(range.start);
  const end = formatDateISO(range.end);
  return useQuery<SalesBreakdownEntry[]>({
    queryKey: ['forecast', 'sales_breakdown', start, end],
    queryFn: async () => (await getSalesBreakdown(start, end)).data,
  });
}
