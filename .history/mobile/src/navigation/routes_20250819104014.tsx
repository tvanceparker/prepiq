import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppLayout from '../components/AppLayout';
import DashboardScreen from '../pages/DashboardScreen'; // legacy placeholder (still used for some TBD routes)
import DailyOverview from '../pages/dashboard/DailyOverview';
import AlertsFeed from '../pages/dashboard/AlertsFeed';
import MenuItemQuickEntry from '../pages/dashboard/MenuItemQuickEntry';
import UpcomingForecast from '../pages/sales/UpcomingForecast';
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
import IngredientTrends from '../pages/analytics/IngredientTrends';
import DishProfitability from '../pages/analytics/DishProfitability';
import WasteDashboard from '../pages/analytics/WasteDashboard';
import InsightsOptimization from '../pages/analytics/InsightsOptimization';
import LoginScreen from '../pages/auth/LoginScreen';
import { AuthContext } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

const routeComponents: Record<string, React.ComponentType<any>> = {
  'auth_login': LoginScreen,
  'dashboard_daily-overview': DailyOverview,
  'dashboard_alerts': AlertsFeed,
  'dashboard_menu-item-entry': MenuItemQuickEntry,
  'sales_upcoming': UpcomingForecast,
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
  'analytics_ingredient-trends': IngredientTrends,
  'analytics_dish-profitability': DishProfitability,
  'analytics_waste-dashboard': WasteDashboard,
  'analytics_insights-optimization': InsightsOptimization,
  'settings_restaurant': SettingsScreen,
  'settings_account-settings': SettingsScreen,
};

export function AppRoutes() {
  const { token } = useContext(AuthContext);
  return (
    <Stack.Navigator screenOptions={{ headerShown:false }}>
      {Object.entries(routeComponents).map(([name, Comp]) => {
        const isAuthScreen = name.startsWith('auth_');
        if (!token && !isAuthScreen) return null; // hide protected when not logged in
        if (token && isAuthScreen) return null; // hide auth screens when logged
        const Wrapper = (props:any) => isAuthScreen ? <Comp {...props} /> : <AppLayout><Comp {...props} /></AppLayout>;
        return <Stack.Screen key={name} name={name} component={Wrapper} />;
      })}
    </Stack.Navigator>
  );
}

