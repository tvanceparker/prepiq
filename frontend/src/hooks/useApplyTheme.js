import { useEffect } from "react";

export default function useApplyTheme(themePreference) {
    useEffect(() => {
        console.log("useApplyTheme called with:", themePreference);

        const root = document.documentElement;

        const apply = (mode) => {
            console.log("Applying mode:", mode);
            if (mode === "dark") root.classList.add("dark");
            else root.classList.remove("dark");
        };

        if (themePreference === "system") {
            const media = window.matchMedia("(prefers-color-scheme: dark)");
            apply(media.matches ? "dark" : "light");

            const listener = (e) => {
                console.log("System theme changed to:", e.matches ? "dark" : "light");
                apply(e.matches ? "dark" : "light");
            };
            media.addEventListener("change", listener);

            return () => media.removeEventListener("change", listener);
        } else {
            apply(themePreference);
        }
    }, [themePreference]);
}
