import React, { createContext, useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BASE_URL } from "../api/config";
import useApplyTheme from "../hooks/useApplyTheme";
import type { AuthContextType, Preferences, ThemeMode, UserInfo } from "../interfaces/auth";

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  tier: null,
  loading: true,
  preferences: { theme: "light", auto_logout_minutes: 30 },
  setPreferences: () => {},
  theme: "light",
  setTheme: () => {},
  login: async () => {},
  logout: async () => {},
  permissions: [],
  refetchPermissions: async () => {},
});

const defaultPreferences: Preferences = {
  theme: "light",
  auto_logout_minutes: 30,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("preferences");
    if (saved) {
      try {
        const prefs = JSON.parse(saved) as Preferences;
        return (prefs?.theme && prefs.theme !== "system" ? prefs.theme : "light") as ThemeMode;
      } catch {}
    }
    return "light";
  });

  // Theme sync
  useEffect(() => {
    const themeToUse =
      preferences?.theme && preferences.theme !== "system"
        ? (preferences.theme as ThemeMode)
        : "light";
    setTheme(themeToUse);
    localStorage.setItem("theme", themeToUse);
  }, [preferences]);

  useApplyTheme(theme);

  // Load local storage state on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedTier = localStorage.getItem("tier");
    const storedPrefs = localStorage.getItem("preferences");

    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
    if (storedTier) setTier(storedTier);
    if (storedPrefs) {
      try {
        setPreferences(JSON.parse(storedPrefs));
      } catch {
        localStorage.removeItem("preferences");
      }
    }

    setLoading(false);
  }, []);

  // Fetch permissions with React Query
  const {
    data: permissions = [],
    refetch: refetchPermissions,
    isLoading: permissionsLoading,
  } = useQuery<string[]>({
    queryKey: ["permissions", user?.role_id],
    queryFn: async () => {
      if (!user?.role_id || !token) return [];
      const res = await fetch(`${BASE_URL}/admin/roles-with-permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch roles");
      const roles = (await res.json()) as Array<{ role_id: number; permissions: Array<{ name: string }> }>;
      const foundRole = roles.find((r) => r.role_id === user.role_id);
      return foundRole ? foundRole.permissions.map((p) => p.name) : [];
    },
    enabled: !!user?.role_id && !!token,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Login logic
  const login = async ({ token, tier, user, preferences: prefs }: { token: string; tier: string; user: UserInfo; preferences?: Preferences }) => {
    setToken(token);
    setTier(tier);
    setUser(user);

    const newPrefs = prefs || defaultPreferences;
    setPreferences(newPrefs);

    localStorage.setItem("token", token);
    localStorage.setItem("tier", tier);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("preferences", JSON.stringify(newPrefs));

    const themePref =
      newPrefs?.theme && newPrefs.theme !== "system" ? (newPrefs.theme as ThemeMode) : "light";
    setTheme(themePref);
    localStorage.setItem("theme", themePref);

    // Refetch permissions
    if (user?.role_id) {
      queryClient.invalidateQueries({ queryKey: ["permissions", user.role_id] });
    }
  };

  // Logout logic
  const logout = async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("Logout failed", err);
    }

    setToken(null);
    setTier(null);
    setUser(null);
    setPreferences(defaultPreferences);
    setTheme("light");

    localStorage.removeItem("token");
    localStorage.removeItem("tier");
    localStorage.removeItem("user");
    localStorage.setItem("preferences", JSON.stringify(defaultPreferences));
    localStorage.setItem("theme", "light");

    queryClient.removeQueries({ queryKey: ["permissions"] });
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      tier,
      loading: !!(loading || permissionsLoading),
      preferences,
      setPreferences,
      theme,
      setTheme,
      login,
      logout,
      permissions,
      refetchPermissions,
    }),
    [user, token, tier, loading, permissionsLoading, preferences, theme, permissions]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
