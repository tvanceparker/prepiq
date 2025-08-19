import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppLayout from '../components/AppLayout';
import DashboardScreen from '../pages/DashboardScreen';
import InventoryScreen from '../pages/InventoryScreen';
import ForecastScreen from '../pages/ForecastScreen';
import PrepScreen from '../pages/PrepScreen';
import SettingsScreen from '../pages/SettingsScreen';
import AdminScreen from '../pages/AdminScreen';
import ActivityLogs from '../pages/admin/ActivityLogs';
import TenantInfoBasic from '../pages/admin/components/TenantInfoBasic';
import SystemHealthBasic from '../pages/admin/components/SystemHealthBasic';
import RolesPermissionsBasic from '../pages/admin/components/RolesPermissionsBasic';
import UserManagementBasic from '../pages/admin/components/UserManagementBasic';

const Stack = createNativeStackNavigator();

const routeComponents: Record<string, React.ComponentType<any>> = {
  'dashboard_daily-overview': DashboardScreen,
  'dashboard_alerts': DashboardScreen,
  'dashboard_menu-item-entry': DashboardScreen,
  'sales_upcoming': ForecastScreen,
  'sales_menu-mix': ForecastScreen,
  'sales_forecast-accuracy': ForecastScreen,
  'sales_patterns': ForecastScreen,
  'sales_explorer': ForecastScreen,
  'inventory_table': InventoryScreen,
  'inventory_stock-movements': InventoryScreen,
  'inventory_pos': InventoryScreen,
  'inventory_suppliers': InventoryScreen,
  'admin_tenant-info': TenantInfoBasic,
  'admin_activity-logs': ActivityLogs,
  'admin_system-health': SystemHealthBasic,
  'admin_users': UserManagementBasic,
  'admin_roles': RolesPermissionsBasic,
  'settings_restaurant': SettingsScreen,
  'settings_account-settings': SettingsScreen,
};

export function AppRoutes() {
  return (
    <Stack.Navigator screenOptions={{ headerShown:false }}>
      {Object.entries(routeComponents).map(([name, Comp]) => (
        <Stack.Screen key={name} name={name}>
          {() => (
            <AppLayout>
              <Comp />
            </AppLayout>
          )}
        </Stack.Screen>
      ))}
    </Stack.Navigator>
  );
}
