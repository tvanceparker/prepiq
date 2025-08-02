import { useEffect, useState } from "react";

export function useTheme() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const classList = document.documentElement.classList;
        setIsDark(classList.contains("dark"));
    }, []);

    return { isDark };
}
