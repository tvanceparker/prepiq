import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { lightTheme, darkTheme } from './theme';
import RootNavigator from './navigation/RootNavigator';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';

const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UIProvider>
            <ThemedApp />
          </UIProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { theme } = React.useContext(AuthContext);
  const paperTheme = theme === 'dark' ? darkTheme : lightTheme;
  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
