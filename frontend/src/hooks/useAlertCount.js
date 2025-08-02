import { useState, useEffect } from "react";
import { fetchActiveAlertCount } from "../api/alerts";

export default function useAlertCount(pollInterval = 600000) {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    async function getAlertCount() {
        setLoading(true);
        try {
            const res = await fetchActiveAlertCount();
            console.log("API response for alerts count:", res); // <-- add this

            if (res && typeof res.count === "number") {
                setCount(res.count);
            } else {
                setCount(0);
            }
        } catch (error) {
            console.error("Failed to fetch alert count:", error);
            setCount(0);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        getAlertCount();
        const interval = setInterval(getAlertCount, pollInterval);
        return () => clearInterval(interval);
    }, [pollInterval]);

    return { count, loading };
}