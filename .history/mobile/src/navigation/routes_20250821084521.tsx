import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppLayout from '../components/AppLayout';
import DailyOverview from '../pages/dashboard/DailyOverview';
import AlertsFeed from '../pages/dashboard/AlertsFeed';
import MenuItemQuickEntry from '../pages/dashboard/MenuItemQuickEntry';
import UpcomingForecast from '../pages/sales/UpcomingForecast';
import ForecastAccuracy from '../pages/sales/ForecastAccuracy';
import MenuMixInsights from '../pages/sales/MenuMixInsights';
import SalesExplorer from '../pages/sales/SalesExplorer';
import SalesPatterns from '../pages/sales/SalesPatterns';
import AccountSettings from '../pages/settings/AccountSettings';
import RestaurantSettings from '../pages/settings/RestaurantSettings';
import ActivityLogs from '../pages/admin/ActivityLogs';
import { TenantInfoBasic, SystemHealthBasic, RolesPermissionsBasic, UserManagementBasic, SystemAlertsBasic } from '../pages/admin/components'; // still used elsewhere if needed
import TenantInfo from '../pages/admin/TenantInfo';
import RolesAccess from '../pages/admin/RolesAccess';
import SystemHealth from '../pages/admin/SystemHealth';
import SystemAlerts from '../pages/admin/SystemAlerts';
import UserManagement from '../pages/admin/UserManagement';
import IngredientTrends from '../pages/analytics/IngredientTrends';
import DishProfitability from '../pages/analytics/DishProfitability';
import WasteDashboard from '../pages/analytics/WasteDashboard';
import InsightsOptimization from '../pages/analytics/InsightsOptimization';
import LoginScreen from '../pages/auth/LoginScreen';
import { AuthContext } from '../contexts/AuthContext';

// Map screen names (stack keys) to required permissions (if any)
const routePermissions: Record<string, string | undefined> = {
  'admin_tenant-info': 'tenant_info',
  'admin_activity-logs': 'activity_logs',
  'admin_system-health': 'system_check',
  'admin_users': 'employees',
  'admin_roles': 'roles',
  'admin_system-alerts': 'system_alerts',
};

const Stack = createNativeStackNavigator();

const routeComponents: Record<string, React.ComponentType<any>> = {
  'auth_login': LoginScreen,
  'dashboard_daily-overview': DailyOverview,
  'dashboard_alerts': AlertsFeed,
  'dashboard_menu-item-entry': MenuItemQuickEntry,
  'sales_upcoming': UpcomingForecast,
  // sales pages
  'sales_forecast-accuracy': ForecastAccuracy,
  'sales_patterns': SalesPatterns,
  'sales_explorer': SalesExplorer,
  'sales_menu-mix': MenuMixInsights,
  // inventory & other domains not yet implemented in mobile basic tier omitted
  'admin_tenant-info': TenantInfo,
  'admin_activity-logs': ActivityLogs,
  'admin_system-health': SystemHealth,
  'admin_system-alerts': SystemAlerts,
  'admin_users': UserManagement,
  'admin_roles': RolesAccess,
  'analytics_ingredient-trends': IngredientTrends,
  'analytics_dish-profitability': DishProfitability,
  'analytics_waste-dashboard': WasteDashboard,
  'analytics_insights-optimization': InsightsOptimization,
  'settings_restaurant': RestaurantSettings,
  'settings_account-settings': AccountSettings,
};

export function AppRoutes() {
  const { token, permissions } = useContext(AuthContext);
  return (
    <Stack.Navigator screenOptions={{ headerShown:false }}>
      {Object.entries(routeComponents).map(([name, Comp]) => {
        const isAuthScreen = name.startsWith('auth_');
        if (!token && !isAuthScreen) return null; // hide protected when not logged in
        if (token && isAuthScreen) return null; // hide auth screens when logged
  const requiredPerm = routePermissions[name];
  // Only enforce permission gating once we actually have some permissions loaded.
  if (requiredPerm && permissions && permissions.length > 0 && !permissions.includes(requiredPerm)) return null;
        const Wrapper = (props:any) => isAuthScreen ? <Comp {...props} /> : <AppLayout><Comp {...props} /></AppLayout>;
        return <Stack.Screen key={name} name={name} component={Wrapper} />;
      })}
    </Stack.Navigator>
  );
}

