export type ThemeMode = 'light' | 'dark';

export interface Preferences {
  theme: ThemeMode | 'system';
  auto_logout_minutes: number;
}

export interface UserInfo {
  user_id?: number;
  email?: string;
  role_id?: number;
  name?: string;
  [key: string]: unknown;
}

export interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  tier: string | null;
  loading: boolean;
  preferences: Preferences;
  setPreferences: (prefs: Preferences) => void;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  login: (args: {
    token: string;
    tier: string;
    user: UserInfo;
    preferences?: Preferences;
  }) => Promise<void> | void;
  logout: () => Promise<void> | void;
  permissions: string[];
  refetchPermissions: () => Promise<unknown> | void;
}
