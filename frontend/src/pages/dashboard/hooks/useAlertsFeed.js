import { useState, useEffect, useCallback } from "react";
import {
    fetchActiveAlerts,
    fetchAllAlerts,
    acknowledgeAlert,
    resolveAlert,
    fixAlert
} from "../../../api/alerts";

// Normalize alert fields for consistent UI usage
function normalizeAlert(alert) {
    return {
        ...alert,
        status: alert.status.toLowerCase(),          // e.g. "Active" -> "active"
        is_acknowledged: alert.is_acknowledged ?? false,
        severity: alert.severity ? alert.severity.toLowerCase() : "info", // normalize severity
    };
}
const fixableAlertTypes = [
    "DataQuality:NullOrZeroQuantity",
    "DataQuality:MissingChannel",
    "DataQuality:QuantityOutlier",
];

export default function useAlertsFeed({ pageSize = 20 } = {}) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [feedMode, setFeedMode] = useState("active"); // "active" | "all"

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchFn = feedMode === "all" ? fetchAllAlerts : fetchActiveAlerts;
            const dataRaw = await fetchFn(skip, pageSize);

            // Normalize all alerts before setting state
            const data = dataRaw.map(normalizeAlert);

            setAlerts((prev) => (skip === 0 ? data : [...prev, ...data]));
            setHasMore(data.length === pageSize);
        } catch (err) {
            setError(err.message || "Failed to fetch alerts");
        } finally {
            setLoading(false);
        }
    }, [feedMode, skip, pageSize]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    useEffect(() => {
        setSkip(0);
    }, [feedMode]);

    const loadMore = () => {
        if (!loading && hasMore) {
            setSkip((prev) => prev + pageSize);
        }
    };
    const remove = (alertId) => {
        setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId));
    };

    const acknowledge = async (alertId) => {
        try {
            const updatedRaw = await acknowledgeAlert(alertId);
            const updated = normalizeAlert(updatedRaw);
            setAlerts((prev) =>
                prev.map((a) => (a.alert_id === alertId ? updated : a))
            );
        } catch (err) {
            setError(err.message || "Failed to acknowledge alert");
        }
    };

    const resolve = async (alertId) => {
        try {
            const updatedRaw = await resolveAlert(alertId);
            const updated = normalizeAlert(updatedRaw);
            setAlerts((prev) =>
                prev.map((a) => (a.alert_id === alertId ? updated : a))
            );
        } catch (err) {
            setError(err.message || "Failed to resolve alert");
        }
    };

    // New fixAlert method to call backend and update local state
    const fix = async (alertId, fixData) => {
        try {
            console.log(`fixing: ${alertId} and ${JSON.stringify(fixData)}`);
            await fixAlert(alertId, fixData);  // just await the fix call, ignore response

            // Option 1: Just refetch alerts to update UI
            setSkip(0); // reset pagination to force reload
        } catch (err) {
            setError(err.message || "Failed to fix alert");
        }
    };

    // Helper to check if an alert is fixable (for UI button enable/disable)
    const isFixable = (alert) => fixableAlertTypes.includes(alert.alert_type);

    return {
        alerts,
        loading,
        error,
        hasMore,
        loadMore,
        acknowledge,
        resolve,
        fix,
        isFixable,
        setFeedMode,
        remove,
    };
}