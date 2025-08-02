import { useState, useEffect } from "react";

export default function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== "undefined" && window.matchMedia) {
            return window.matchMedia(query).matches;
        }
        return false; // default server-side or fallback
    });

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;

        const mediaQueryList = window.matchMedia(query);
        const listener = (event) => setMatches(event.matches);

        mediaQueryList.addEventListener
            ? mediaQueryList.addEventListener("change", listener)
            : mediaQueryList.addListener(listener); // fallback for older browsers

        // Set initial value (in case it changed since initial render)
        setMatches(mediaQueryList.matches);

        return () => {
            mediaQueryList.removeEventListener
                ? mediaQueryList.removeEventListener("change", listener)
                : mediaQueryList.removeListener(listener);
        };
    }, [query]);

    return matches;
}
