// src/pages/dashboard/hooks/useDailyOverview.js
import { useState, useEffect } from "react";
import { getDailyOverview } from "../../../api/dashboard";

export function useDailyOverview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchOverview() {
            try {
                const overviewData = await getDailyOverview();
                setData(overviewData);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        fetchOverview();
    }, []);

    return { data, loading, error };
}
