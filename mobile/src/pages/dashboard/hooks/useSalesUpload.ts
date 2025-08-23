import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMenuItems, uploadSalesManual, checkSalesExist } from '../../../api/dashboard';
import { getRestaurantSettings } from '../../../api/settings';
import type { MenuItemDTO, SalesEntryInDTO } from '../../../interfaces/dashboard';

// Keep a small local return-shape for conflicts
type SalesConflictMap = Record<string, number>;

export function useSalesUpload() {
  const qc = useQueryClient();

  const {
    data: rawMenuItems = [],
    isLoading: itemsLoading,
    error: itemsError,
    refetch: refetchMenu,
  } = useQuery<MenuItemDTO[], Error>({
    queryKey: ['menuItems'],
    queryFn: getMenuItems,
    // only return active items to consumers
    select: items => (items || []).filter(i => i?.is_active !== false),
  });

  const {
    data: settings = null,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery<any, Error>({
    queryKey: ['restaurantSettings'],
    queryFn: getRestaurantSettings as any,
  });

  // useMutation for submit so the UI can observe loading/error states and react-query can manage lifecycle
  const mutationFn = async (payload: {
    sale_date: string;
    entries: SalesEntryInDTO[];
    overwrite: boolean;
  }) => uploadSalesManual(payload);

  // use object-style useMutation to match project react-query usage and avoid runtime errors
  const uploadMutation = useMutation({
    mutationFn,
    onSuccess: () => {
      // invalidate related overview data so UI refreshes
      qc.invalidateQueries({ queryKey: ['dailyOverview'] });
    },
  });

  const submit = useCallback(
    (sale_date: string, entries: SalesEntryInDTO[], overwrite: boolean) =>
      uploadMutation.mutateAsync({ sale_date, entries, overwrite }),
    [uploadMutation]
  );

  const load = useCallback(async () => {
    // trigger refetch for both menu and settings and wait
    const [m, s] = await Promise.all([refetchMenu(), refetchSettings()]);
    // propagate any error
    if (m.error) throw m.error;
    if (s.error) throw s.error;
    return { menu: m.data as MenuItemDTO[], settings: s.data };
  }, [refetchMenu, refetchSettings]);

  const checkConflicts = useCallback(async (sale_date: string, entries: SalesEntryInDTO[]) => {
    const ch = Array.from(new Set(entries.map(e => e.sales_channel))).filter(Boolean) as string[];
    const res: { conflicts?: SalesConflictMap } = await checkSalesExist(sale_date, ch as any);
    return res?.conflicts || {};
  }, []);

  const channels: string[] = (settings?.sales_channels as string[])?.filter(Boolean) || [];

  const loading = itemsLoading || settingsLoading;
  const error = itemsError || settingsError || null;
  // expose mutation state for callers that want to show progress
  const submitLoading = uploadMutation.status === 'pending';
  const submitError = uploadMutation.error ?? null;

  return {
    items: rawMenuItems as MenuItemDTO[],
    channels,
    loading,
    error,
    load,
    checkConflicts,
    submit,
    submitLoading,
    submitError,
  };
}
