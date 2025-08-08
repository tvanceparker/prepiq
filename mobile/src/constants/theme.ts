import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// PrepIQ brand colors - modern and sleek restaurant management theme
export const Colors = {
  primary: '#1976D2',        // Material Blue
  primaryVariant: '#0D47A1',
  secondary: '#FFA726',      // Amber for accent
  secondaryVariant: '#FF8F00',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Dark mode
  backgroundDark: '#121212',
  surfaceDark: '#1E1E1E',
  onSurfaceDark: '#FFFFFF',
  onBackgroundDark: '#FFFFFF',
  
  // Text colors
  textPrimary: '#212121',
  textSecondary: '#757575',
  textHint: '#BDBDBD',
  
  // Specific to restaurant features
  inventory: '#4CAF50',
  sales: '#2196F3',
  prep: '#FF9800',
  team: '#9C27B0',
  analytics: '#795548',
  
  // Status colors
  online: '#4CAF50',
  offline: '#F44336',
  pending: '#FF9800',
  completed: '#4CAF50',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primary + '20',
    secondary: Colors.secondary,
    secondaryContainer: Colors.secondary + '20',
    surface: Colors.surface,
    background: Colors.background,
    error: Colors.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onSurface: Colors.textPrimary,
    onBackground: Colors.textPrimary,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary,
    primaryContainer: Colors.primary + '30',
    secondary: Colors.secondary,
    secondaryContainer: Colors.secondary + '30',
    surface: Colors.surfaceDark,
    background: Colors.backgroundDark,
    error: Colors.error,
    onPrimary: '#FFFFFF',
    onSecondary: '#000000',
    onSurface: Colors.onSurfaceDark,
    onBackground: Colors.onBackgroundDark,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 50,
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};