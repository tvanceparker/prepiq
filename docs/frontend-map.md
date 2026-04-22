# Frontend Map

## Status

This map is based on active navigation and route wiring, not filenames alone. The primary web source is `frontend/src/components/data/sidebarData.js`; routability is verified against `frontend/src/routes/AppRoutes.tsx`.

## Navigation Sources

| Source | Meaning |
| --- | --- |
| `frontend/src/components/data/sidebarData.js` | Primary source for current web sidebar sections, page labels, and basic/full visibility. |
| `frontend/src/routes/AppRoutes.tsx` | Source for whether a route actually renders in the web app. |
| `frontend/src/components/Sidebar.tsx` | Normalizes tier: `basic` stays basic; every other tier becomes `full`. |
| `frontend/src/components/TierGatedRoute.tsx` | Route-level tier guard. Currently used narrowly. |
| `mobile/src/navigation/sidebarData.ts` | Mobile sidebar equivalent to the web sidebar. |
| `mobile/src/navigation/routes.tsx` | Mobile routability map from route names to screen components. |

## Web Shell

`frontend/src/App.tsx` renders public auth routes without the app shell. Authenticated pages are wrapped in `frontend/src/components/Layout.tsx`.

The authenticated shell provides:

- sidebar navigation from `sidebarDataByTier`
- alert badge from `useAlertCount` calling `/alerts/active_count`
- theme/user footer controls
- global assistant floater from `frontend/src/components/assistant/AssistantFloater`

## Basic Tier Sidebar

| Section | Route | Component | Key data paths | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | `/dashboard/daily-overview` | `DailyOverview` -> `BasicOverview` for basic tier | `frontend/src/api/dashboard.ts`, `/dashboard/*` | Includes basic daily cards and sales upload/template flows. |
| Dashboard | `/dashboard/alerts` | `AlertsFeed` | `frontend/src/api/alerts.ts`, `/alerts/*` | Also linked by layout alert badge. |
| Dashboard | `/dashboard/menu-item-entry` | `MenuItemEntry` | dashboard menu item helpers | Quick menu item entry surface. |
| Sales & Forecasting | `/sales/upcoming` | `UpcomingForecast` | `frontend/src/api/forecast.ts`, `/sales_forecast/upcoming/*` | Full tier currently falls back to the basic component too. |
| Sales & Forecasting | `/sales/menu-mix` | `MenuMixInsights` | `/sales_forecast/sales_breakdown*`, pro variants for full | Basic uses basic endpoints; full uses `MenuMixInsightsPro`. |
| Sales & Forecasting | `/sales/forecast-accuracy` | `ForecastAccuracy` | forecast accuracy endpoints | Only basic component is wired; full falls back to it. |
| Sales & Forecasting | `/sales/patterns` | `SalesPatterns` | pattern endpoints | Only basic component is wired; full falls back to it. |
| Sales & Forecasting | `/sales/explorer` | `SalesExplorer` | explorer table/download endpoints | Only basic component is wired; full falls back to it. |
| Admin Panel | `/admin/tenant-info` | `TenantInfo` | `frontend/src/api/admin.ts`, `/admin/tenant_info` | Active admin page. |
| Admin Panel | `/admin/users` | `UserManagement` | employee/role endpoints | Active user management page. |
| Settings | `/settings/restaurant` | `RestaurantSettings` | `/settings/restaurant_settings` | Restaurant profile/settings. |
| Settings | `/settings/integrations` | `IntegrationSettings` | assistant and POS settings APIs | Includes assistant settings and POS integration settings. |
| Settings | `/settings/account-settings` | `AccountSettings` | account/preference/password endpoints | Account and preference settings. |

## Full Tier Sidebar

Full includes the active basic surfaces plus these routes:

| Section | Route | Component | Key data paths | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | `/dashboard/quick-analytics` | `QuickAnalytics` | `/dashboard/quick-analytics` | Full dashboard analytics card surface. |
| Menu & Recipes | `/menu/builder` | `MenuBuilder` | `frontend/src/api/menu.ts`, `/menu/*` | Full menu management. |
| Menu & Recipes | `/menu/recipe-editor` | `RecipeEditor` | recipe endpoints | Supports recipe composition and usage analysis. |
| Menu & Recipes | `/menu/prep-batches` | `PrepBatches` | batch recipe endpoints | Full batch recipe surface. |
| Inventory & Purchasing | `/inventory/table` | `InventoryTable` | `frontend/src/api/inventory.ts`, `/inventory/view`, details, lots, adjustments | Main inventory surface. |
| Inventory & Purchasing | `/inventory/stock-movements` | `StockMovements` | `/inventory/stock_movements` | Wrapped in `TierGatedRoute requiredTiers={['full']}`. |
| Inventory & Purchasing | `/inventory/purchase-orders` | `PurchaseOrders` | PO endpoints and suggestion endpoints | PO lifecycle and reorder suggestions. |
| Inventory & Purchasing | `/menu/ingredient-costing` | `IngredientCatalog` | menu ingredient/supplier endpoints | Ingredient costing/catalog surface lives under `/menu`. |
| Inventory & Purchasing | `/inventory/suppliers` | `Suppliers` | supplier and ingredient supplier endpoints | Supplier management. |
| Prep Management | `/prep/schedule` | `PrepSchedule` | `frontend/src/api/prep.ts`, `/prep/schedule` | Full prep scheduling. |
| Prep Management | `/prep/batch-recipes` | `BatchRecipes` | `/prep/batch_recipes/*` | Prep-side batch recipe management. |
| Prep Management | `/prep/logs` | `PrepLogs` | `/prep/logs` | Prep execution logs. |
| Prep Management | `/prep/waste-logs` | `WasteLogs` | `/prep/waste-logs` | Waste capture. |
| Analytics | `/analytics/ingredient-trends` | `IngredientTrends` | `/profit_analytics/ingredient_cost_trends` | Ingredient spend/cost trend page. |
| Analytics | `/analytics/dish-profitability` | `DishProfitability` | `/profit_analytics/dish_profitability` | Dish margin/food cost page. |
| Analytics | `/analytics/waste` | `WasteAnalytics` | `/waste_analytics/summary` | Waste analytics page. |
| Analytics | `/analytics/insights` | `Insights` | mixed analytics APIs | Full insights page. |

## Hidden Or Redirected Routes

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Active redirect | Redirects to `/dashboard/daily-overview`. |
| `/dashboard/eod-summary` | Routed but not in sidebar | Web and mobile have an EOD summary screen, but it is not advertised in sidebar data. |
| `/inventory/pos` | Redirect | Redirects to `/inventory/purchase-orders`, preserving older links. |

## Code-Resident But Not Surfaced In Active Web Navigation

These files may compile or have API wrappers, but current web sidebar/AppRoutes do not make them active product pages:

- `frontend/src/pages/dashboard/LiveOperations.tsx`
- admin pages such as `ActivityLogs`, `SystemHealth`, `SystemAlerts`, and `RolesAccess`
- team pages and `frontend/src/api/team.ts`
- order-entry/POS pages beyond purchase-order and integration settings surfaces

## Mobile Parity Notes

Mobile mirrors the basic/full sidebar model in `mobile/src/navigation/sidebarData.ts`. `mobile/src/navigation/routes.tsx` maps those routes to screen components and also contains route entries for:

- `dashboard_eod-summary`
- `sales_upload-wizard`
- `inventory_pos`, mapped to purchase orders for legacy compatibility

Mobile also contains team, live-operations, kitchen, and waiter-adjacent source files that are not part of the current active navigation map.

## Tier And Naming Traps

- Client tier normalization turns legacy raw backend `pro` or `master` into UI tier `full`; backend runtime tier handling now follows the same normalization.
- `DailyOverview` renders `MasterOverview` for the full tier. The component name is legacy; the product tier is full.
- `ProOverview` is imported in `DailyOverview` but not selected by the current switch.
- The full menu-mix page calls backend pro endpoints. Other full sales pages mostly reuse basic components.
