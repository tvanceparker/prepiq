// src/pages/sales/hooks/useSalesPatterns.js
import { useState, useEffect, useCallback } from "react";
import {
    getSalesOverTimeByItem,
    getSalesHeatmapData,
    getWeekdaySalesAvg,
    getSalesChannelBreakdown,
} from "../../../api/forecast";

export function useSalesPatterns() {
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 14); // Subtract 14 days
        return d.toISOString().slice(0, 10); // yyyy-mm-dd
    });

    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    });

    const [byRevenue, setByRevenue] = useState(false);

    const [salesOverTime, setSalesOverTime] = useState([]);
    const [heatmapData, setHeatmapData] = useState(null);
    const [weekdayAvg, setWeekdayAvg] = useState([]);
    const [channelBreakdown, setChannelBreakdown] = useState([]);
    const [normalize, setNormalize] = useState(false);


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [
                salesOverTimeRes,
                heatmapRes,
                weekdayAvgRes,
                channelBreakdownRes,
            ] = await Promise.all([
                getSalesOverTimeByItem(startDate, endDate, byRevenue),
                getSalesHeatmapData(startDate, endDate, byRevenue, normalize),
                getWeekdaySalesAvg(startDate, endDate, byRevenue),
                getSalesChannelBreakdown(startDate, endDate, byRevenue),
            ]);
            setSalesOverTime(salesOverTimeRes);
            setHeatmapData(heatmapRes);
            setWeekdayAvg(weekdayAvgRes);
            setChannelBreakdown(channelBreakdownRes);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, byRevenue, normalize]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        byRevenue,
        setByRevenue,
        normalize,
        setNormalize,
        salesOverTime,
        heatmapData,
        weekdayAvg,
        channelBreakdown,
        loading,
        error,
    };
    
}
