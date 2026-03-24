export const sidebarDataByTier = {
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
        { name: 'Tenant Info', path: '/admin/tenant-info' },
        { name: 'User Management', path: '/admin/users' },
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

  full: [
    {
      label: 'Dashboard',
      children: [
        { name: 'Daily Overview', path: '/dashboard/daily-overview' },
        { name: 'Alerts & Issues Feed', path: '/dashboard/alerts' },
        { name: 'Quick Analytics', path: '/dashboard/quick-analytics' },
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
      label: 'Inventory & Purchasing',
      children: [
        { name: 'Inventory Table', path: '/inventory/table' },
        { name: 'Stock Movements', path: '/inventory/stock-movements' },
        { name: 'Purchase Orders', path: '/inventory/purchase-orders' },
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
        { name: 'Prep Waste Logs', path: '/prep/waste-logs' },
      ],
    },
    {
      label: 'Analytics',
      children: [
        { name: 'Ingredient Cost Trends', path: '/analytics/ingredient-trends' },
        { name: 'Dish Profitability', path: '/analytics/dish-profitability' },
        { name: 'Waste Dashboard', path: '/analytics/waste' },
        { name: 'Insights & Optimization', path: '/analytics/insights' },
      ],
    },
    {
      label: 'Admin Panel',
      children: [
        { name: 'Tenant Info', path: '/admin/tenant-info' },
        { name: 'User Management', path: '/admin/users' },
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
