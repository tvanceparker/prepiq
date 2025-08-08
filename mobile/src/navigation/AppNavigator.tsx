import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuthStore } from '../stores/authStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

// Import screens (we'll create these next)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import MenuScreen from '../screens/menu/MenuScreen';
import PrepScreen from '../screens/prep/PrepScreen';
import TeamScreen from '../screens/team/TeamScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SalesScreen from '../screens/sales/SalesScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Sales: undefined;
  Inventory: undefined;
  Menu: undefined;
  Prep: undefined;
  Team: undefined;
  Analytics: undefined;
  More: undefined;
};

export type DrawerParamList = {
  Home: undefined;
  Settings: undefined;
  Logout: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const Drawer = createDrawerNavigator<DrawerParamList>();

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Sales':
              iconName = focused ? 'chart-line' : 'chart-line-variant';
              break;
            case 'Inventory':
              iconName = focused ? 'package-variant' : 'package-variant-closed';
              break;
            case 'Menu':
              iconName = focused ? 'silverware-fork-knife' : 'silverware-clean';
              break;
            case 'Prep':
              iconName = focused ? 'chef-hat' : 'chef-hat';
              break;
            case 'Team':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Analytics':
              iconName = focused ? 'chart-bar' : 'chart-bar';
              break;
            case 'More':
              iconName = focused ? 'dots-horizontal' : 'dots-horizontal';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.textHint,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <MainTab.Screen 
        name="Sales" 
        component={SalesScreen}
        options={{ title: 'Sales' }}
      />
      <MainTab.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={{ title: 'Inventory' }}
      />
      <MainTab.Screen 
        name="Menu" 
        component={MenuScreen}
        options={{ title: 'Menu' }}
      />
      <MainTab.Screen 
        name="Prep" 
        component={PrepScreen}
        options={{ title: 'Prep' }}
      />
      <MainTab.Screen 
        name="Team" 
        component={TeamScreen}
        options={{ title: 'Team' }}
      />
      <MainTab.Screen 
        name="Analytics" 
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <MainTab.Screen 
        name="More" 
        component={SettingsScreen}
        options={{ title: 'More' }}
      />
    </MainTab.Navigator>
  );
}

// Root Navigator
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    // TODO: Add loading screen
    return null;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}