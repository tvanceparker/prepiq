import { useEffect, useRef } from "react";

export default function useAutoLogout({ logout, timeoutMinutes }) {
    const timerRef = useRef(null);

    useEffect(() => {
        // If no timeout or invalid timeout, don't set the timer
        if (!timeoutMinutes || timeoutMinutes <= 0) return;

        // Clear any existing timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Set new timer
        timerRef.current = setTimeout(() => {
            logout();
        }, timeoutMinutes * 60 * 1000);

        // Clear on unmount or dependency change
        return () => clearTimeout(timerRef.current);
    }, [logout, timeoutMinutes]);
}
