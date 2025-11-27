export interface SidebarChildItem {
  name: string;
  path: string;
  permission?: string;
}
export interface SidebarSection {
  label: string;
  children: SidebarChildItem[];
}

export const sidebarDataByTier: Record<string, SidebarSection[]> = {
  basic: [
    {
      label: 'Dashboard',
      children: [
        { name: 'Daily Overview', path: '/dashboard/daily-overview' },
        { name: 'Alerts & Insights Feed', path: '/dashboard/alerts' },
        { name: 'Menu Item Quick Entry', path: '/dashboard/menu-item-entry' },
      ],
    },
    {
      label: 'POS',
      children: [
        { name: 'Order Management', path: '/orders' },
        { name: 'POS Terminal', path: '/pos' },
        { name: 'Kitchen Display', path: '/kitchen' },
        { name: 'Device Registration', path: '/pos/device-registration' },
      ],
    },
    {
      label: 'Sales & Forecasting',
      children: [
        { name: 'Upcoming Forecast', path: '/sales/upcoming' },
        { name: 'Menu Mix Insights', path: '/sales/menu-mix' },
        { name: 'Forecast Accuracy', path: '/sales/forecast-accuracy' },
        { name: 'Sales Patterns', path: '/sales/patterns' },
        { name: 'Sales Explorer', path: '/sales/explorer' },
      ],
    },
    {
      label: 'Admin Panel',
      children: [
        { name: 'Tenant Info', path: '/admin/tenant-info', permission: 'tenant_info' },
        { name: 'Activity Logs', path: '/admin/activity-logs', permission: 'activity_logs' },
        { name: 'System Health Check', path: '/admin/system-health', permission: 'system_check' },
        { name: 'User Management', path: '/admin/users', permission: 'employees' },
        { name: 'Roles & Access', path: '/admin/roles', permission: 'roles' },
      ],
    },
    {
      label: 'Settings',
      children: [
        { name: 'Restaurant Settings', path: '/settings/restaurant' },
        { name: 'Account Settings', path: '/settings/account-settings' },
      ],
    },
  ],
  pro: [
    {
      label: 'Dashboard',
      children: [
        { name: 'Daily Overview', path: '/dashboard/daily-overview' },
        { name: 'Alerts & Insights Feed', path: '/dashboard/alerts' },
        { name: 'Live Operations', path: '/dashboard/live-operations' },
        { name: 'Quick Analytics', path: '/dashboard/quick-analytics' },
      ],
    },
    {
      label: 'POS',
      children: [
        { name: 'Order Management', path: '/orders' },
        { name: 'POS Terminal', path: '/pos' },
        { name: 'Kitchen Display', path: '/kitchen' },
        { name: 'Device Registration', path: '/pos/device-registration' },
      ],
    },
    {
      label: 'Menu & Recipes',
      children: [
        { name: 'Menu Builder', path: '/menu/builder' },
        { name: 'Recipe Editor', path: '/menu/recipe-editor' },
        { name: 'Prep Batches', path: '/menu/prep-batches' },
      ],
    },
    {
      label: 'Sales & Forecasting',
      children: [
        { name: 'Upcoming Forecast', path: '/sales/upcoming' },
        { name: 'Menu Mix Insights', path: '/sales/menu-mix' },
        { name: 'Forecast Accuracy', path: '/sales/forecast-accuracy' },
        { name: 'Sales Patterns', path: '/sales/patterns' },
        { name: 'Sales Explorer', path: '/sales/explorer' },
      ],
    },
    {
      label: 'Inventory',
      children: [
        { name: 'Inventory Table', path: '/inventory/table' },
        { name: 'Stock Movements', path: '/inventory/stock-movements' },
        { name: 'Ingredient Catalog', path: '/menu/ingredient-costing' },
        { name: 'Suppliers', path: '/inventory/suppliers' },
      ],
    },
    {
      label: 'Prep Management',
      children: [
        { name: 'Prep Schedule', path: '/prep/schedule' },
        { name: 'Batch Recipes', path: '/prep/batch-recipes' },
        { name: 'Prep Logs', path: '/prep/logs' },
      ],
    },
    {
      label: 'Team / Workforce',
      children: [
        { name: 'Clock-In Log', path: '/team/clock-in' },
        { name: 'Shift Manager', path: '/team/shifts' },
      ],
    },
    {
      label: 'Analytics',
      children: [
        { name: 'Ingredient Cost Trends', path: '/analytics/ingredient-trends' },
        { name: 'Dish Profitability', path: '/analytics/dish-profitability' },
      ],
    },
    {
      label: 'Admin Panel',
      children: [
        { name: 'Tenant Info', path: '/admin/tenant-info', permission: 'tenant_info' },
        { name: 'Activity Logs', path: '/admin/activity-logs', permission: 'activity_logs' },
        { name: 'System Health Check', path: '/admin/system-health', permission: 'system_check' },
        { name: 'User Management', path: '/admin/users', permission: 'employees' },
        { name: 'Roles & Access', path: '/admin/roles', permission: 'roles' },
      ],
    },
    {
      label: 'Settings',
      children: [
        { name: 'Restaurant Settings', path: '/settings/restaurant' },
        { name: 'Integration Settings', path: '/settings/integrations' },
        { name: 'Account Settings', path: '/settings/account-settings' },
      ],
    },
  ],
  master: [
    {
      label: 'Dashboard',
      children: [
        { name: 'Daily Overview', path: '/dashboard/daily-overview' },
        { name: 'Alerts & Issues Feed', path: '/dashboard/alerts' },
        { name: 'Live Operations', path: '/dashboard/live-operations' },
        { name: 'Quick Analytics', path: '/dashboard/quick-analytics' },
      ],
    },
    {
      label: 'POS',
      children: [
        { name: 'Order Management', path: '/orders' },
        { name: 'POS Terminal', path: '/pos' },
        { name: 'Kitchen Display', path: '/kitchen' },
        { name: 'Device Registration', path: '/pos/device-registration' },
      ],
    },
    {
      label: 'Sales & Forecasting',
      children: [
        { name: 'Forecast Accuracy', path: '/sales/forecast-accuracy' },
        { name: 'Menu Mix Insights', path: '/sales/menu-mix' },
        { name: 'Sales Patterns', path: '/sales/patterns' },
        { name: 'Sales Explorer', path: '/sales/explorer' },
      ],
    },
    {
      label: 'Menu & Recipes',
      children: [
        { name: 'Menu Builder', path: '/menu/builder' },
        { name: 'Recipe Editor', path: '/menu/recipe-editor' },
        { name: 'Prep Batches', path: '/menu/prep-batches' },
      ],
    },
    {
      label: 'Inventory & Purchasing',
      children: [
        { name: 'Inventory Table', path: '/inventory/table' },
        { name: 'Stock Movements', path: '/inventory/stock-movements' },
        { name: 'Purchase Orders (POs)', path: '/inventory/pos' },
        { name: 'Ingredient Catalog', path: '/menu/ingredient-costing' },
        { name: 'Suppliers', path: '/inventory/suppliers' },
      ],
    },
    {
      label: 'Profit & Waste Analytics',
      children: [
        { name: 'Ingredient Cost Trends', path: '/analytics/ingredient-trends' },
        { name: 'Dish Profitability', path: '/analytics/dish-profitability' },
        { name: 'Waste Dashboard', path: '/analytics/waste' },
        { name: 'Insights & Optimization', path: '/analytics/insights' },
      ],
    },
    {
      label: 'Prep Management',
      children: [
        { name: 'Prep Schedule', path: '/prep/schedule' },
        { name: 'Batch Recipes', path: '/prep/batch-recipes' },
        { name: 'Prep Logs', path: '/prep/logs' },
        { name: 'Prep Waste Logs', path: '/prep/waste-logs' },
      ],
    },
    {
      label: 'Team / Workforce',
      children: [
        { name: 'Clock-In Log', path: '/team/clock-in' },
        { name: 'Shift Manager', path: '/team/shifts' },
        { name: 'Team Insights', path: '/team/insights' },
      ],
    },
    {
      label: 'Admin Panel',
      children: [
        { name: 'Tenant Info', path: '/admin/tenant-info' },
        { name: 'System Alerts', path: '/admin/system-alerts', permission: 'system_alerts' },
        { name: 'System Health Check', path: '/admin/system-health' },
        { name: 'User Management', path: '/admin/users' },
        { name: 'Activity Logs', path: '/admin/activity-logs' },
        { name: 'Roles & Access', path: '/admin/roles' },
      ],
    },
    {
      label: 'Settings',
      children: [
        { name: 'Restaurant Settings', path: '/settings/restaurant' },
        { name: 'Integration Settings', path: '/settings/integrations' },
        { name: 'Account Settings', path: '/settings/account-settings' },
      ],
    },
  ],
};

export function flattenSidebarPaths(tier?: string) {
  if (!tier) return [] as string[];
  return (sidebarDataByTier[tier] || []).flatMap(s => s.children.map(c => c.path));
}
