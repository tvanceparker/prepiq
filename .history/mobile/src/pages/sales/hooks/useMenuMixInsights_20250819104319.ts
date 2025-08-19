import { useState, useEffect } from 'react';
import { getSalesBreakdown, getSalesOverTime, getTopBottomItems } from '../../../api/forecast';

export default function useMenuMixInsights(startDate:string, endDate:string, byRevenue:boolean){
  const [topView,setTopView] = useState(true);
  const [selectedMenuItemIds,setSelectedMenuItemIds] = useState<number[]>([]);
  const [breakdownData,setBreakdownData] = useState<any[]>([]);
  const [overTimeData,setOverTimeData] = useState<any[]>([]);
  const [topBottomData,setTopBottomData] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  useEffect(()=> { if(!startDate||!endDate) return; (async()=> { setLoading(true); try { const [breakdown, overTime, topBottom] = await Promise.all([
    getSalesBreakdown(startDate,endDate,byRevenue),
    getSalesOverTime(startDate,endDate,byRevenue),
    getTopBottomItems(startDate,endDate,byRevenue, topView, 10),
  ]); setBreakdownData(breakdown); setOverTimeData(overTime); setTopBottomData(topBottom);} catch(e){ console.error('menu mix insights',e);} finally { setLoading(false);} })(); },[startDate,endDate,byRevenue,topView]);
  return { breakdownData, overTimeData, topBottomData, topView, setTopView, loading, selectedMenuItemIds, setSelectedMenuItemIds };
}
