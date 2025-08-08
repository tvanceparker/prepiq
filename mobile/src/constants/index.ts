export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://api.prepiq.com'; // Production

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  
  // Dashboard
  DAILY_OVERVIEW: '/dashboard/daily-overview',
  ALERTS: '/alerts',
  
  // Sales
  FORECAST: '/sales/forecast',
  SALES_DATA: '/sales/data',
  SALES_PATTERNS: '/sales/patterns',
  
  // Inventory
  INVENTORY: '/inventory',
  STOCK_MOVEMENTS: '/inventory/stock-movements',
  SUPPLIERS: '/inventory/suppliers',
  
  // Menu
  MENU_ITEMS: '/menu/items',
  RECIPES: '/menu/recipes',
  
  // Prep
  PREP_SCHEDULE: '/prep/schedule',
  PREP_LOGS: '/prep/logs',
  
  // Team
  EMPLOYEES: '/team/employees',
  CLOCK_EVENTS: '/team/clock-events',
  SHIFTS: '/team/shifts',
  
  // Analytics
  ANALYTICS: '/analytics',
  PROFITABILITY: '/analytics/profitability',
  
  // Settings
  RESTAURANT: '/settings/restaurant',
  ACCOUNT: '/settings/account',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME_PREFERENCE: 'theme_preference',
  RESTAURANT_DATA: 'restaurant_data',
};

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard_view',
  
  // Inventory
  INVENTORY_VIEW: 'inventory_view',
  INVENTORY_EDIT: 'inventory_edit',
  INVENTORY_DELETE: 'inventory_delete',
  
  // Menu
  MENU_VIEW: 'menu_view',
  MENU_EDIT: 'menu_edit',
  MENU_DELETE: 'menu_delete',
  
  // Sales
  SALES_VIEW: 'sales_view',
  SALES_EDIT: 'sales_edit',
  
  // Team
  TEAM_VIEW: 'team_view',
  TEAM_EDIT: 'team_edit',
  
  // Admin
  ADMIN_ACCESS: 'admin_access',
  USER_MANAGEMENT: 'user_management',
  SYSTEM_SETTINGS: 'system_settings',
};

export const SUBSCRIPTION_TIERS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CHEF: 'chef',
  COOK: 'cook',
  SERVER: 'server',
  HOST: 'host',
  CASHIER: 'cashier',
};