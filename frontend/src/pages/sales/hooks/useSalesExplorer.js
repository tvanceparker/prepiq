import { useState, useEffect, useCallback } from "react";
import {
    getSalesExplorerTable,
    downloadSalesExplorerExcel,
    createSale,
    updateSale,
} from "../../../api/forecast";
import { getMenuItems } from "../../../api/dashboard";
import { getRestaurantSettings } from "../../../api/settings"; // import the new API call

export function useSalesExplorer() {
    const [data, setData] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [salesChannels, setSalesChannels] = useState([]); // new state for sales_channels
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    // Fetch sales data whenever startDate or endDate changes
    const fetchData = useCallback(async () => {
        if (!startDate || !endDate) return;

        setLoading(true);
        setError(null);

        try {
            const response = await getSalesExplorerTable(startDate, endDate);
            setData(response);
        } catch (err) {
            setError(err.message || "Failed to fetch sales data");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    // Fetch menu items and restaurant settings on mount
    useEffect(() => {
        async function fetchInitialData() {
            try {
                const [menuResponse, settingsResponse] = await Promise.all([
                    getMenuItems(),
                    getRestaurantSettings(),
                ]);
                setMenuItems(menuResponse);
                setSalesChannels(settingsResponse.sales_channels || []);
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
            }
        }
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const downloadExcel = useCallback(async () => {
        if (!startDate || !endDate) return;

        try {
            const { blob, filename } = await downloadSalesExplorerExcel(startDate, endDate);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename || "sales_data.xlsx";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
            alert("Failed to download Excel.");
        }
    }, [startDate, endDate]);

    const createSaleRecord = useCallback(
        async (saleData) => {
            setLoading(true);
            setError(null);
            try {
                const result = await createSale(saleData);
                await fetchData(); // refresh data after create
                return result;
            } catch (err) {
                setError(err.message || "Failed to create sale");
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [fetchData]
    );

    const updateSaleRecord = useCallback(
        async (saleId, saleData) => {
            setLoading(true);
            setError(null);
            try {
                const result = await updateSale(saleId, saleData);
                await fetchData(); // refresh data after update
                return result;
            } catch (err) {
                setError(err.message || "Failed to update sale");
                throw err;
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
        filters: {
            startDate,
            setStartDate,
            endDate,
            setEndDate,
        },
        downloadExcel,
        createSaleRecord,
        updateSaleRecord,
    };
}
