import React, { createContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContextType, Preferences, ThemeMode, UserInfo } from '../interfaces/auth';

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  tier: null,
  loading: true,
  preferences: { theme: 'light', auto_logout_minutes: 30 },
  setPreferences: () => {},
  theme: 'light',
  setTheme: () => {},
  login: async () => {},
  logout: async () => {},
  permissions: [],
  refetchPermissions: async () => {},
});

const defaultPreferences: Preferences = { theme: 'light', auto_logout_minutes: 30 };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser, storedTier, storedPrefs, storedTheme] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
          AsyncStorage.getItem('tier'),
          AsyncStorage.getItem('preferences'),
          AsyncStorage.getItem('theme'),
        ]);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedTier) setTier(storedTier);
        if (storedPrefs) setPreferences(JSON.parse(storedPrefs));
        if (storedTheme) setTheme(storedTheme as ThemeMode);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const refetchPermissions = async () => [];

  const login = async ({
    token,
    tier,
    user,
    preferences: prefs,
  }: {
    token: string;
    tier: string;
    user: UserInfo;
    preferences?: Preferences;
  }) => {
    setToken(token);
    setTier(tier);
    setUser(user);
    const newPrefs = prefs || defaultPreferences;
    setPreferences(newPrefs);
    setTheme((newPrefs.theme !== 'system' ? newPrefs.theme : 'light') as ThemeMode);
    await Promise.all([
      AsyncStorage.setItem('token', token),
      AsyncStorage.setItem('tier', tier),
      AsyncStorage.setItem('user', JSON.stringify(user)),
      AsyncStorage.setItem('preferences', JSON.stringify(newPrefs)),
      AsyncStorage.setItem(
        'theme',
        (newPrefs.theme !== 'system' ? newPrefs.theme : 'light') as string
      ),
    ]);
    setPermissions([]);
  };

  const logout = async () => {
    try {
      // Call the new /auth/logout endpoint
      const token = await AsyncStorage.getItem('token');
      if (token) {
        await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/auth/logout`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ).catch(e => console.warn('Logout API failed:', e));
      }
    } catch (e) {
      console.warn('Logout failed:', e);
    }

    setToken(null);
    setTier(null);
    setUser(null);
    setPreferences(defaultPreferences);
    setTheme('light');
    setPermissions([]);
    await Promise.all([
      AsyncStorage.removeItem('token'),
      AsyncStorage.removeItem('tier'),
      AsyncStorage.removeItem('user'),
      AsyncStorage.setItem('preferences', JSON.stringify(defaultPreferences)),
      AsyncStorage.setItem('theme', 'light'),
    ]);
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      tier,
      loading,
      preferences,
      setPreferences,
      theme,
      setTheme,
      login,
      logout,
      permissions,
      refetchPermissions,
    }),
    [user, token, tier, loading, preferences, theme, permissions]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
