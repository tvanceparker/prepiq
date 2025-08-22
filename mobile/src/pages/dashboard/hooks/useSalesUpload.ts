import { useCallback, useState } from 'react';
import { getMenuItems, uploadSalesManual, checkSalesExist } from '../../../api/dashboard';
import { getRestaurantSettings } from '../../../api/settings';
import type {
  MenuItemDTO,
  EodSalesEntryDTO,
  SalesConflictOutDTO,
} from '../../../interfaces/dashboard';

export function useSalesUpload() {
  const [items, setItems] = useState<MenuItemDTO[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [menu, settings] = await Promise.all([getMenuItems(), getRestaurantSettings() as any]);
      const activeOnly = (menu || []).filter(i => i?.is_active !== false);
      setItems(activeOnly);
      setChannels(((settings?.sales_channels as string[]) || []).filter(Boolean));
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkConflicts = useCallback(async (sale_date: string, entries: EodSalesEntryDTO[]) => {
    const ch = Array.from(new Set(entries.map(e => e.sales_channel))).filter(
      (c): c is string => !!c
    );
    const res: SalesConflictOutDTO = await checkSalesExist(sale_date, ch);
    return res.conflicts || {};
  }, []);

  const submit = useCallback(
    async (sale_date: string, entries: EodSalesEntryDTO[], overwrite: boolean) => {
      return uploadSalesManual({ sale_date, overwrite, entries });
    },
    []
  );

  return { items, channels, loading, error, load, checkConflicts, submit };
}
