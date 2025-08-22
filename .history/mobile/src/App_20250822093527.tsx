import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { ThemeProvider, useAppTheme } from './contexts/ThemeContext';
import RootNavigator from './navigation/RootNavigator';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient();

function ThemedAppInner() {
  const { themeName } = useAppTheme();
  const isDark = themeName === 'dark';
  const navTheme = isDark ? DarkTheme : DefaultTheme;
  const paperTheme = isDark ? MD3DarkTheme : MD3LightTheme;
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
