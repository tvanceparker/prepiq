import { useState, useEffect, useCallback } from 'react';
import { getSalesExplorerTable, downloadSalesExplorerExcel, createSale, updateSale } from '../../../api/forecast';
import { getMenuItems } from '../../../api/dashboard';
import { getRestaurantSettings } from '../../../api/settings';

export function useSalesExplorer(){
  const [data,setData] = useState<any[]>([]);
  const [menuItems,setMenuItems] = useState<any[]>([]);
  const [salesChannels,setSalesChannels] = useState<string[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [startDate,setStartDate] = useState<string|null>(null);
  const [endDate,setEndDate] = useState<string|null>(null);

  const fetchData = useCallback(async ()=> { if(!startDate||!endDate) return; setLoading(true); setError(null); try { const resp = await getSalesExplorerTable(startDate,endDate); setData(resp);} catch(e:any){ setError(e.message||'Failed to fetch sales data'); } finally { setLoading(false);} },[startDate,endDate]);

  useEffect(()=> { (async()=> { try { const [menuResp, settingsResp] = await Promise.all([ getMenuItems(), getRestaurantSettings() ]); setMenuItems(menuResp); setSalesChannels(settingsResp.sales_channels || []);} catch(e){ console.error('initial sales explorer',e);} })(); },[]);
  useEffect(()=> { fetchData(); },[fetchData]);

  const downloadExcel = useCallback(async ()=> { if(!startDate||!endDate) return; try { /* mobile: skipping actual file save for now */ await downloadSalesExplorerExcel(startDate,endDate); } catch(e){ console.error('download excel',e);} },[startDate,endDate]);

  const createSaleRecord = useCallback(async (saleData:any)=> { setLoading(true); setError(null); try { const result = await createSale(saleData); await fetchData(); return result; } catch(e:any){ setError(e.message||'Failed to create sale'); throw e; } finally { setLoading(false);} },[fetchData]);
  const updateSaleRecord = useCallback(async (saleId:number|string, saleData:any)=> { setLoading(true); setError(null); try { const result = await updateSale(saleId,saleData); await fetchData(); return result; } catch(e:any){ setError(e.message||'Failed to update sale'); throw e; } finally { setLoading(false);} },[fetchData]);

  return { data, menuItems, salesChannels, loading, error, filters:{ startDate,setStartDate,endDate,setEndDate }, downloadExcel, createSaleRecord, updateSaleRecord };
}
