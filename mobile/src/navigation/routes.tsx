import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppLayout from '../components/AppLayout';
// Dashboard
import DailyOverview from '../pages/dashboard/DailyOverview';
import AlertsFeed from '../pages/dashboard/AlertsFeed';
import MenuItemQuickEntry from '../pages/dashboard/MenuItemQuickEntry';
// Sales
import UpcomingForecast from '../pages/sales/UpcomingForecast';
import ForecastAccuracy from '../pages/sales/ForecastAccuracy';
import MenuMixInsights from '../pages/sales/MenuMixInsights';
import SalesExplorer from '../pages/sales/SalesExplorer';
import SalesPatterns from '../pages/sales/SalesPatterns';
import SalesUploadWizard from '../pages/dashboard/components/SalesUploadWizard';
// Settings
import AccountSettings from '../pages/settings/AccountSettings';
import RestaurantSettings from '../pages/settings/RestaurantSettings';
// Admin
import ActivityLogs from '../pages/admin/ActivityLogs';
import {
  TenantInfoBasic,
  SystemHealthBasic,
  RolesPermissionsBasic,
  UserManagementBasic,
  SystemAlertsBasic,
} from '../pages/admin/components'; // still used elsewhere if needed
import TenantInfo from '../pages/admin/TenantInfo';
import RolesAccess from '../pages/admin/RolesAccess';
import SystemHealth from '../pages/admin/SystemHealth';
import SystemAlerts from '../pages/admin/SystemAlerts';
import UserManagement from '../pages/admin/UserManagement';
// Analytics
import IngredientTrends from '../pages/analytics/IngredientTrends';
import DishProfitability from '../pages/analytics/DishProfitability';
import WasteDashboard from '../pages/analytics/WasteDashboard';
import InsightsOptimization from '../pages/analytics/InsightsOptimization';
// Auth
import LoginScreen from '../pages/auth/LoginScreen';
import { AuthContext } from '../contexts/AuthContext';
// POS
import { KitchenDisplay, POSTerminal, OrdersManagement, DeviceRegistration } from '../pages/pos';
// Inventory
import { InventoryList, Suppliers, PurchaseOrders, StockMovements } from '../pages/inventory';
// Menu
import { MenuBuilder, RecipeEditor, PrepBatches, IngredientCatalog } from '../pages/menu';
// Prep
import { PrepSchedule, WasteLogs, PrepLogs, BatchRecipes } from '../pages/prep';
// Team
import { Employees, ClockInLog, ShiftManager, TeamInsights } from '../pages/team';
// Settings extras
import IntegrationSettings from '../pages/settings/IntegrationSettings';

// Map screen names (stack keys) to required permissions (if any)
const routePermissions: Record<string, string | undefined> = {
  'admin_tenant-info': 'tenant_info',
  'admin_activity-logs': 'activity_logs',
  'admin_system-health': 'system_check',
  admin_users: 'employees',
  admin_roles: 'roles',
  'admin_system-alerts': 'system_alerts',
};

const Stack = createNativeStackNavigator();

const routeComponents: Record<string, React.ComponentType<any>> = {
  auth_login: LoginScreen,
  // Dashboard
  'dashboard_daily-overview': DailyOverview,
  dashboard_alerts: AlertsFeed,
  'dashboard_menu-item-entry': MenuItemQuickEntry,
  // Sales pages
  sales_upcoming: UpcomingForecast,
  'sales_forecast-accuracy': ForecastAccuracy,
  sales_patterns: SalesPatterns,
  sales_explorer: SalesExplorer,
  'sales_menu-mix': MenuMixInsights,
  'sales_upload-wizard': SalesUploadWizard,
  // POS pages
  orders: OrdersManagement,
  pos: POSTerminal,
  kitchen: KitchenDisplay,
  'pos_device-registration': DeviceRegistration,
  // Inventory pages
  'inventory_table': InventoryList,
  'inventory_stock-movements': StockMovements,
  'inventory_pos': PurchaseOrders,
  'inventory_suppliers': Suppliers,
  // Menu pages
  'menu_builder': MenuBuilder,
  'menu_recipe-editor': RecipeEditor,
  'menu_prep-batches': PrepBatches,
  'menu_ingredient-costing': IngredientCatalog,
  // Prep pages
  'prep_schedule': PrepSchedule,
  'prep_waste-logs': WasteLogs,
  'prep_logs': PrepLogs,
  'prep_batch-recipes': BatchRecipes,
  // Team pages
  'team_clock-in': ClockInLog,
  'team_shifts': ShiftManager,
  'team_insights': TeamInsights,
  'team_employees': Employees,
  // Admin pages
  'admin_tenant-info': TenantInfo,
  'admin_activity-logs': ActivityLogs,
  'admin_system-health': SystemHealth,
  'admin_system-alerts': SystemAlerts,
  admin_users: UserManagement,
  admin_roles: RolesAccess,
  // Analytics pages
  'analytics_ingredient-trends': IngredientTrends,
  'analytics_dish-profitability': DishProfitability,
  'analytics_waste': WasteDashboard,
  'analytics_insights': InsightsOptimization,
  // Settings pages
  settings_restaurant: RestaurantSettings,
  'settings_account-settings': AccountSettings,
  'settings_integrations': IntegrationSettings,
};

export function AppRoutes() {
  const { token, permissions } = useContext(AuthContext);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {Object.entries(routeComponents).map(([name, Comp]) => {
        const isAuthScreen = name.startsWith('auth_');
        if (!token && !isAuthScreen) return null; // hide protected when not logged in
        if (token && isAuthScreen) return null; // hide auth screens when logged
        const requiredPerm = routePermissions[name];
        // Only enforce permission gating once we actually have some permissions loaded.
        if (
          requiredPerm &&
          permissions &&
          permissions.length > 0 &&
          !permissions.includes(requiredPerm)
        )
          return null;
        const Wrapper = (props: any) =>
          isAuthScreen ? (
            <Comp {...props} />
          ) : (
            <AppLayout>
              <Comp {...props} />
            </AppLayout>
          );
        return <Stack.Screen key={name} name={name} component={Wrapper} />;
      })}
    </Stack.Navigator>
  );
}
