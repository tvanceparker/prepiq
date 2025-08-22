import { useState, useEffect, useCallback } from 'react';
import { getSalesExplorerTable, downloadSalesExplorerExcel, createSale, updateSale } from '../../../api/forecast';
import { getMenuItems } from '../../../api/dashboard';
import { getRestaurantSettings } from '../../../api/settings';

export function useSalesExplorer() {
  const [data, setData] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [salesChannels, setSalesChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // default to last 30 days so mobile screens show data without manual input
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 29);
  const [startDate, setStartDate] = useState<string | null>(toIso(thirtyDaysAgo));
  const [endDate, setEndDate] = useState<string | null>(toIso(now));

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    try {
      const resp = await getSalesExplorerTable(startDate, endDate);
      if (cancelled) return;
      setData(Array.isArray(resp) ? resp : []);
    } catch (e: any) {
      if (!cancelled) setError(e?.message || 'Failed to fetch sales data');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [menuResp, settingsResp] = await Promise.all([
          getMenuItems(),
          getRestaurantSettings(),
        ]);
        if (!mounted) return;
        setMenuItems(Array.isArray(menuResp) ? menuResp : []);
        setSalesChannels((settingsResp && settingsResp.sales_channels) || []);
      } catch (e) {
        console.error('initial sales explorer', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadExcel = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      // mobile: skipping actual file save for now — server returns a download URL or blob
      await downloadSalesExplorerExcel(startDate, endDate);
    } catch (e) {
      console.error('download excel', e);
    }
  }, [startDate, endDate]);

  const createSaleRecord = useCallback(
    async (saleData: any) => {
      setLoading(true);
      setError(null);
      try {
        const result = await createSale(saleData);
        await fetchData();
        return result;
      } catch (e: any) {
        setError(e?.message || 'Failed to create sale');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  const updateSaleRecord = useCallback(
    async (saleId: number | string, saleData: any) => {
      setLoading(true);
      setError(null);
      try {
        const result = await updateSale(saleId, saleData);
        await fetchData();
        return result;
      } catch (e: any) {
        setError(e?.message || 'Failed to update sale');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [fetchData]
  );

  return {
    data,
    menuItems,
    salesChannels,
    loading,
    error,
    filters: { startDate, setStartDate, endDate, setEndDate },
    downloadExcel,
    createSaleRecord,
    updateSaleRecord,
  };
}
