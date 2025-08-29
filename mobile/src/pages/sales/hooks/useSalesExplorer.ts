import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSalesExplorerTable,
  downloadSalesExplorerExcel,
  createSale,
  updateSale,
} from '../../../api/forecast';
import { getMenuItems } from '../../../api/dashboard';
import { getRestaurantSettings } from '../../../api/settings';

export function useSalesExplorer() {
  const queryClient = useQueryClient();
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 29);
  const [startDate, setStartDate] = useState<string | null>(toIso(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string | null>(toIso(now));
  const [menuItemId, setMenuItemId] = useState<string | number | null>(null);

  const { data: menuItems = [] } = useQuery({ queryKey: ['menuItems'], queryFn: getMenuItems });
  const { data: settings = null } = useQuery<any, Error>({
    queryKey: ['restaurantSettings'],
    queryFn: getRestaurantSettings as any,
  });

  const {
    data: tableData = [],
    isLoading: tableLoading,
    refetch: refetchTable,
  } = useQuery({
    queryKey: ['salesExplorer', startDate, endDate, menuItemId],
    queryFn: () =>
      startDate && endDate
        ? getSalesExplorerTable(startDate, endDate, menuItemId ? [menuItemId] : [], [])
        : [],
    enabled: !!startDate && !!endDate,
  });

  const downloadExcel = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      await downloadSalesExplorerExcel(startDate, endDate);
    } catch (e) {
      console.error('download excel', e);
    }
  }, [startDate, endDate]);

  const createFn = async (saleData: any) => createSale(saleData);
  const updateFn = async ({ id, data }: { id: number | string; data: any }) => updateSale(id, data);

  // useMutation for create (TanStack Query v5 object syntax)
  const createMutation = useMutation({
    mutationFn: createFn as any,
    onSuccess: (created: any) => {
      const key = ['salesExplorer', startDate, endDate, menuItemId];
      queryClient.setQueryData<any[]>(key, old => {
        const prev = Array.isArray(old) ? old : [];
        // Prepend or append as desired; here we append
        return [...prev, created];
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateFn as any,
    onSuccess: (_res: any, vars: { id: number | string; data: any }) => {
      const key = ['salesExplorer', startDate, endDate, menuItemId];
      queryClient.setQueryData<any[]>(key, old => {
        if (!Array.isArray(old)) return old;
        return old.map(row => {
          const rid = row.sale_id ?? row.saleId ?? row.id;
          if (String(rid) !== String(vars.id)) return row;
          // Merge updated fields into cached row
          return { ...row, ...vars.data };
        });
      });
    },
  });

  const createSaleRecord = useCallback(
    async (saleData: any) => {
      const r = await (createMutation as any).mutateAsync(saleData);
      return r;
    },
    [createMutation]
  );

  const updateSaleRecord = useCallback(
    async (saleId: number | string, saleData: any) => {
      const r = await (updateMutation as any).mutateAsync({ id: saleId, data: saleData });
      return r;
    },
    [updateMutation]
  );

  return {
    data: tableData as any[],
    menuItems: menuItems as any[],
    salesChannels: (settings && (settings as any).sales_channels) || [],
    loading: tableLoading,
    error: null,
    refetch: refetchTable,
    filters: { startDate, setStartDate, endDate, setEndDate, menuItemId, setMenuItemId },
    downloadExcel,
    createSaleRecord,
    updateSaleRecord,
    createLoading: (createMutation as any).isLoading as boolean,
    createError: (createMutation as any).error ?? null,
    updateLoading: (updateMutation as any).isLoading as boolean,
    updateError: (updateMutation as any).error ?? null,
  };
}
