import { useState, useEffect } from "react";
import {
    getSalesBreakdown,
    getSalesOverTime,
    getTopBottomItems,
} from "../../../api/forecast";

export default function useMenuMixInsights(startDate, endDate, byRevenue) {
    const [topView, setTopView] = useState(true);
    const [selectedMenuItemIds, setSelectedMenuItemIds] = useState([]);
    const [breakdownData, setBreakdownData] = useState([]);
    const [overTimeData, setOverTimeData] = useState([]);
    const [topBottomData, setTopBottomData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!startDate || !endDate) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [breakdown, overTime, topBottom] = await Promise.all([
                    getSalesBreakdown(startDate, endDate, byRevenue),
                    getSalesOverTime(startDate, endDate, byRevenue),
                    getTopBottomItems(startDate, endDate, byRevenue, topView, 10),
                ]);

                setBreakdownData(breakdown);
                setOverTimeData(overTime);
                setTopBottomData(topBottom);
            } catch (err) {
                console.error("Error loading menu mix insights:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [startDate, endDate, byRevenue, topView]);

    return {
        breakdownData,
        overTimeData,
        topBottomData,
        topView,
        setTopView,
        loading,
        selectedMenuItemIds,
        setSelectedMenuItemIds,
    };
}
