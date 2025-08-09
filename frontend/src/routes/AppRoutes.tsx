// src/routes/AppRoutes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import PermissionRoute from "../components/PermissionRoute";

//Login
import Login from "../pages/auth/Login";

// Dashboard
import DailyOverview from "../pages/dashboard/DailyOverview";
import AlertsFeed from "../pages/dashboard/AlertsFeed";
import ShiftReadiness from "../pages/dashboard/ShiftReadiness";
import YesterdaysTrends from "../pages/dashboard/YesterdaysTrends";
import MenuItemQuickEntry from "../pages/dashboard/MenuItemQuickEntry";

// Sales
import ForecastAccuracy from "../pages/sales/ForecastAccuracy";
import MenuMixInsights from "../pages/sales/MenuMixInsights";
import SalesPatterns from "../pages/sales/SalesPatterns";
import SalesExplorer from "../pages/sales/SalesExplorer";
import UpcomingForecast from "../pages/sales/UpcomingForecast";

// Menu
import MenuBuilder from "../pages/menu/MenuBuilder";
import RecipeEditor from "../pages/menu/RecipeEditor";
import PrepBatches from "../pages/menu/PrepBatches";

// Inventory
import InventoryTable from "../pages/inventory/InventoryTable";
import StockMovements from "../pages/inventory/StockMovements";
import POs from "../pages/inventory/PurchaseOrders";
import IngredientCatalog from "../pages/inventory/IngredientCatalog";
import Suppliers from "../pages/inventory/Suppliers";

// Analytics
import IngredientTrends from "../pages/analytics/IngredientTrends";
import DishProfitability from "../pages/analytics/DishProfitability";
import WasteDashboard from "../pages/analytics/WasteDashboard";
import InsightsOptimization from "../pages/analytics/InsightsOptimization";

// Prep
import PrepSchedule from "../pages/prep/PrepSchedule";
import BatchRecipes from "../pages/prep/BatchRecipes";
import PrepLogs from "../pages/prep/PrepLogs";
import PrepWasteLogs from "../pages/prep/PrepWasteLogs";

// Team
import ClockInLog from "../pages/team/ClockInLog";
import ShiftManager from "../pages/team/ShiftManager";

import TeamInsights from "../pages/team/TeamInsights";

// Admin
import TenantInfo from "../pages/admin/TenantInfo";
import SystemAlerts from "../pages/admin/SystemAlerts";
import SystemHealth from "../pages/admin/SystemHealth";
import ActivityLogs from "../pages/admin/ActivityLogs";
import UserManagement from "../pages/admin/UserManagement";
import RolesAccess from "../pages/admin/RolesAccess";

// Settings
import RestaurantSettings from "../pages/settings/RestaurantSettings";
import IntegrationSettings from "../pages/settings/IntegrationSettings";
import AccountSettings from "../pages/settings/AccountSettings";

import Kitchen from "../pages/Kitchen";
import Waiter from "../pages/Waiter";

export default function AppRoutes(): JSX.Element {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/"
          element={<Navigate to="/dashboard/daily-overview" replace />}
        />
        <Route path="*" element={<h1>404 - Page Not Found</h1>} />

        <Route path="/kitchen" element={<Kitchen />} />
        <Route path="/waiter" element={<Waiter />} />

        {/* Dashboard */}
        <Route path="/dashboard/daily-overview" element={<DailyOverview />} />
        <Route path="/dashboard/alerts" element={<AlertsFeed />} />
        <Route path="/dashboard/shift-readiness" element={<ShiftReadiness />} />
        <Route path="/dashboard/yesterday" element={<YesterdaysTrends />} />
        <Route
          path="/dashboard/menu-item-entry"
          element={<MenuItemQuickEntry />}
        />

        {/* Sales */}
        <Route path="/sales/forecast-accuracy" element={<ForecastAccuracy />} />
        <Route path="/sales/menu-mix" element={<MenuMixInsights />} />
        <Route path="/sales/patterns" element={<SalesPatterns />} />
        <Route path="/sales/explorer" element={<SalesExplorer />} />
        <Route path="/sales/upcoming" element={<UpcomingForecast />} />

        {/* Menu */}
        <Route path="/menu/builder" element={<MenuBuilder />} />
        <Route path="/menu/recipe-editor" element={<RecipeEditor />} />

        <Route path="/menu/prep-batches" element={<PrepBatches />} />

        {/* Inventory */}
        <Route path="/inventory/table" element={<InventoryTable />} />
        <Route path="/inventory/stock-movements" element={<StockMovements />} />
        <Route path="/inventory/pos" element={<POs />} />
        <Route
          path="/menu/ingredient-costing"
          element={<IngredientCatalog />}
        />
        <Route path="/inventory/suppliers" element={<Suppliers />} />

        {/* Analytics */}
        <Route
          path="/analytics/ingredient-trends"
          element={<IngredientTrends />}
        />
        <Route
          path="/analytics/dish-profitability"
          element={<DishProfitability />}
        />
        <Route path="/analytics/waste" element={<WasteDashboard />} />
        <Route path="/analytics/insights" element={<InsightsOptimization />} />

        {/* Prep */}
        <Route path="/prep/schedule" element={<PrepSchedule />} />
        <Route path="/prep/batch-recipes" element={<BatchRecipes />} />
        <Route path="/prep/logs" element={<PrepLogs />} />
        <Route path="/prep/waste-logs" element={<PrepWasteLogs />} />

        {/* Team */}
        <Route path="/team/clock-in" element={<ClockInLog />} />
        <Route path="/team/shifts" element={<ShiftManager />} />
        <Route path="/team/insights" element={<TeamInsights />} />

        {/* Admin */}
        <Route element={<PermissionRoute required="tenant_info" />}>
          <Route path="/admin/tenant-info" element={<TenantInfo />} />
        </Route>
        <Route path="/admin/system-alerts" element={<SystemAlerts />} />
        <Route element={<PermissionRoute required="system_check" />}>
          <Route path="/admin/system-health" element={<SystemHealth />} />
        </Route>
        <Route element={<PermissionRoute required="activity_logs" />}>
          <Route path="/admin/activity-logs" element={<ActivityLogs />} />
        </Route>
        <Route element={<PermissionRoute required="employees" />}>
          <Route path="/admin/users" element={<UserManagement />} />
        </Route>
        <Route element={<PermissionRoute required="roles" />}>
          <Route path="/admin/roles" element={<RolesAccess />} />
        </Route>

        {/* Settings */}
        <Route path="/settings/restaurant" element={<RestaurantSettings />} />
        <Route
          path="/settings/integrations"
          element={<IntegrationSettings />}
        />
        <Route
          path="/settings/account-settings"
          element={<AccountSettings />}
        />
      </Route>
    </Routes>
  );
}
