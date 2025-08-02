
import { useState, useEffect } from "react";
import {
    fetchAllInventory,
    fetchLotInfo,
    fetchUsedUsageLogs,
    fetchWastedUsageLogs,
} from "../../../api/inventory";

// ✅ 1. Main inventory list
export function useInventoryTable() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        fetchAllInventory()
            .then(setInventory)
            .catch(setError)
            .finally(() => setLoading(false));
    }, []);

    return { inventory, loading, error };
}

// ✅ 2. Lot info (supplier, etc.)
export function useLotInfo(lotId) {
    const [lotInfo, setLotInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lotId) {
            setLotInfo(null);
            return;
        }
        setLoading(true);
        fetchLotInfo(lotId)
            .then(setLotInfo)
            .catch(() => setLotInfo(null))
            .finally(() => setLoading(false));
    }, [lotId]);

    return { lotInfo, loading };
}

// ✅ 3. Used usage logs
export function useUsedUsageLogs(lotId) {
    const [usedLogs, setUsedLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lotId) {
            setUsedLogs([]);
            return;
        }
        setLoading(true);
        fetchUsedUsageLogs(lotId)
            .then(setUsedLogs)
            .catch(() => setUsedLogs([]))
            .finally(() => setLoading(false));
    }, [lotId]);

    return { usedLogs, loading };
}

// ✅ 4. Wasted usage logs
export function useWastedUsageLogs(lotId) {
    const [wastedLogs, setWastedLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lotId) {
            setWastedLogs([]);
            return;
        }
        setLoading(true);
        fetchWastedUsageLogs(lotId)
            .then(setWastedLogs)
            .catch(() => setWastedLogs([]))
            .finally(() => setLoading(false));
    }, [lotId]);

    return { wastedLogs, loading };
}
