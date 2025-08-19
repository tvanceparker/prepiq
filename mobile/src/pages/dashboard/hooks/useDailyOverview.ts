import { useState, useEffect } from 'react';
import { getDailyOverview } from '../../../api/dashboard';

interface ForecastItem { menu_item_id:number; name:string; forecasted_quantity:number }
interface Accuracy { accuracy_percent:number; note?:string }
interface DailyOverviewData { forecasted_sales_today?: { forecasted_quantity:number; forecasted_revenue:number }; top_5_items_today: ForecastItem[]; accuracy_yesterday?: Accuracy }

export function useDailyOverview() {
  const [data,setData] = useState<DailyOverviewData | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<Error|null>(null);
  useEffect(()=>{ (async() => { try { const d = await getDailyOverview(); setData(d as any); } catch(e:any){ setError(e);} finally { setLoading(false);} })(); },[]);
  return { data, loading, error };
}
