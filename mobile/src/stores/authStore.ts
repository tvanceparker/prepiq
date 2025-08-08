import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  restaurant_id?: string;
  subscription_tier?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  timezone: string;
  subscription_tier: string;
}

interface AuthState {
  user: User | null;
  restaurant: Restaurant | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (user: User, token: string, restaurant?: Restaurant) => void;
  setUser: (user: User) => void;
  setRestaurant: (restaurant: Restaurant) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

// Secure token storage
const tokenStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {
      // Fallback to AsyncStorage if SecureStore fails
      await AsyncStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {
      await AsyncStorage.removeItem(name);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      restaurant: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: async (user: User, token: string, restaurant?: Restaurant) => {
        await tokenStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        set({
          user,
          restaurant,
          token,
          isAuthenticated: true,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setRestaurant: (restaurant: Restaurant) => {
        set({ restaurant });
      },

      logout: async () => {
        await tokenStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        await tokenStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        set({
          user: null,
          restaurant: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      hasPermission: (permission: string): boolean => {
        const { user } = get();
        return user?.permissions?.includes(permission) || false;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        restaurant: state.restaurant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);