import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ThemeProvider, useAppTheme } from './contexts/ThemeContext';
import RootNavigator from './navigation/RootNavigator';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme, LightTheme, DarkTheme } from './theme';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {},
    mutations: {},
  },
});

function ThemedAppInner() {
  const { themeName } = useAppTheme();
  const isDark = themeName === 'dark';
  const navTheme = isDark ? DarkTheme : LightTheme;
  const paperTheme = isDark ? darkTheme : lightTheme;
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ThemedAppInner />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
