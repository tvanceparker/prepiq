import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper';

// Map MUI-like tokens here. Adjust to match your web colors.
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976d2',
    secondary: '#9c27b0',
    background: '#fafafa',
    surface: '#ffffff',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90caf9',
    secondary: '#ce93d8',
  },
};

export const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: lightTheme as any,
  reactNavigationDark: darkTheme as any,
});
