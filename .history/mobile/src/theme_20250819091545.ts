import { MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';

// Map MUI-like tokens here. Adjust to match your web colors.
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976d2',
    secondary: '#9c27b0',
    background: '#fafafa',
    surface: '#ffffff',
  },
};

export const { LightTheme, DarkTheme } = adaptNavigationTheme({ reactNavigationLight: theme as any, reactNavigationDark: theme as any });
