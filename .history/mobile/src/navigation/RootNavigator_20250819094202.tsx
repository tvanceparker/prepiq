import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../pages/DashboardScreen';
import InventoryScreen from '../pages/InventoryScreen';
import ForecastScreen from '../pages/ForecastScreen';
import PrepScreen from '../pages/PrepScreen';
import SettingsScreen from '../pages/SettingsScreen';
import AdminScreen from '../pages/AdminScreen';
import LoginScreen from '../screens/LoginScreen';
import { AuthContext } from '../contexts/AuthContext';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Forecast" component={ForecastScreen} />
      <Tab.Screen name="Prep" component={PrepScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { token, loading } = React.useContext(AuthContext);
  if (loading) {
    return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><ActivityIndicator /></View>;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Admin" component={AdminScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
