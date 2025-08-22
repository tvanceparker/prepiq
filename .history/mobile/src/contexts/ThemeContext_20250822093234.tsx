import React, { createContext, useState, useContext, useMemo } from 'react';

type ThemeName = 'light' | 'dark';

interface ThemeContextValue {
  themeName: ThemeName;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('light');
  const toggleTheme = () => setThemeName(t => (t === 'light' ? 'dark' : 'light'));

  const value = useMemo(() => ({ themeName, toggleTheme }), [themeName]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used within ThemeProvider');
  return ctx;
}

export const isDark = (name: ThemeName) => name === 'dark';
