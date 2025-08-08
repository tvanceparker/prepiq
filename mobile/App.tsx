import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/stores/authStore';
import { lightTheme, darkTheme } from './src/constants/theme';
import { STORAGE_KEYS } from './src/constants';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  const { setLoading, setAuth } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      try {
        // Check for stored auth token
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        const userData = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
        const restaurantData = await SecureStore.getItemAsync(STORAGE_KEYS.RESTAURANT_DATA);

        if (token && userData) {
          const user = JSON.parse(userData);
          const restaurant = restaurantData ? JSON.parse(restaurantData) : null;
          setAuth(user, token, restaurant);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <AppNavigator />
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
