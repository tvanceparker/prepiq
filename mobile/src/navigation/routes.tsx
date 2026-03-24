import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AppLayout from '../components/AppLayout';
// Dashboard
import DailyOverview from '../pages/dashboard/DailyOverview';
import AlertsFeed from '../pages/dashboard/AlertsFeed';
import MenuItemQuickEntry from '../pages/dashboard/MenuItemQuickEntry';
import QuickAnalytics from '../pages/dashboard/QuickAnalytics';
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
import { TenantInfoBasic, UserManagementBasic } from '../pages/admin/components'; // still used elsewhere if needed
import TenantInfo from '../pages/admin/TenantInfo';
import UserManagement from '../pages/admin/UserManagement';
// Analytics
import IngredientTrends from '../pages/analytics/IngredientTrends';
import DishProfitability from '../pages/analytics/DishProfitability';
import WasteDashboard from '../pages/analytics/WasteDashboard';
import InsightsOptimization from '../pages/analytics/InsightsOptimization';
// Auth
import LoginScreen from '../pages/auth/LoginScreen';
import { AuthContext } from '../contexts/AuthContext';
// Inventory
import { InventoryList, Suppliers, PurchaseOrders, StockMovements } from '../pages/inventory';
// Menu
import { MenuBuilder, RecipeEditor, PrepBatches, IngredientCatalog } from '../pages/menu';
// Prep
import { PrepSchedule, WasteLogs, PrepLogs, BatchRecipes } from '../pages/prep';
// Settings extras
import IntegrationSettings from '../pages/settings/IntegrationSettings';

const Stack = createNativeStackNavigator();

const routeComponents: Record<string, React.ComponentType<any>> = {
  auth_login: LoginScreen,
  // Dashboard
  'dashboard_daily-overview': DailyOverview,
  dashboard_alerts: AlertsFeed,
  'dashboard_menu-item-entry': MenuItemQuickEntry,
  'dashboard_quick-analytics': QuickAnalytics,
  // Sales pages
  sales_upcoming: UpcomingForecast,
  'sales_forecast-accuracy': ForecastAccuracy,
  sales_patterns: SalesPatterns,
  sales_explorer: SalesExplorer,
  'sales_menu-mix': MenuMixInsights,
  'sales_upload-wizard': SalesUploadWizard,
  // Inventory pages
  inventory_table: InventoryList,
  'inventory_stock-movements': StockMovements,
  inventory_pos: PurchaseOrders,
  'inventory_purchase-orders': PurchaseOrders,
  inventory_suppliers: Suppliers,
  // Menu pages
  menu_builder: MenuBuilder,
  'menu_recipe-editor': RecipeEditor,
  'menu_prep-batches': PrepBatches,
  'menu_ingredient-costing': IngredientCatalog,
  // Prep pages
  prep_schedule: PrepSchedule,
  'prep_waste-logs': WasteLogs,
  prep_logs: PrepLogs,
  'prep_batch-recipes': BatchRecipes,
  // Admin pages
  'admin_tenant-info': TenantInfo,
  admin_users: UserManagement,
  // Analytics pages
  'analytics_ingredient-trends': IngredientTrends,
  'analytics_dish-profitability': DishProfitability,
  analytics_waste: WasteDashboard,
  analytics_insights: InsightsOptimization,
  // Settings pages
  settings_restaurant: RestaurantSettings,
  'settings_account-settings': AccountSettings,
  settings_integrations: IntegrationSettings,
};

export function AppRoutes() {
  const { token } = useContext(AuthContext);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {Object.entries(routeComponents).map(([name, Comp]) => {
        const isAuthScreen = name.startsWith('auth_');
        if (!token && !isAuthScreen) return null; // hide protected when not logged in
        if (token && isAuthScreen) return null; // hide auth screens when logged
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
