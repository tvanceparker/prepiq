# Feature Matrix

## Status

This matrix follows the current product-facing basic/full model from web and mobile navigation. Backend tier handling now normalizes legacy `pro` and `master` values to `full`.

## Active Tier Matrix

| Feature area | Basic | Full | Web route(s) | Backend route(s) | Notes |
| --- | --- | --- | --- | --- | --- |
| Daily overview | Yes | Yes | `/dashboard/daily-overview` | `/dashboard/*` | Full renders legacy-named `MasterOverview`. |
| Alerts feed | Yes | Yes | `/dashboard/alerts` | `/alerts/*` | Active count appears in the layout. |
| Menu item entry | Yes | Yes | `/dashboard/menu-item-entry` | dashboard menu item helpers | Quick entry surface, distinct from full menu builder. |
| Upcoming forecast | Yes | Yes | `/sales/upcoming` | `/sales_forecast/upcoming/*` | Full currently uses the same basic component. |
| Menu mix insights | Yes | Yes, advanced path | `/sales/menu-mix` | `/sales_forecast/sales_breakdown*` | Full currently uses legacy pro-named backend endpoint paths, but guards use full-tier normalization. |
| Forecast accuracy | Yes | Yes | `/sales/forecast-accuracy` | `/sales_forecast/accuracy-*` | Full currently uses basic component. |
| Sales patterns | Yes | Yes | `/sales/patterns` | `/sales_forecast/patterns/*` | Full currently uses basic component. |
| Sales explorer | Yes | Yes | `/sales/explorer` | `/sales_forecast/sales_explorer/*` | Full currently uses basic component. |
| Tenant info | Yes | Yes | `/admin/tenant-info` | `/admin/tenant_info` | Active admin page. |
| User management | Yes | Yes | `/admin/users` | `/admin/employees`, `/admin/roles` | Active admin page. |
| Restaurant settings | Yes | Yes | `/settings/restaurant` | `/settings/restaurant_settings` | Active settings page. |
| Integration settings | Yes | Yes | `/settings/integrations` | `/settings/assistant/*`, `/settings/pos/*` | Assistant and POS settings live here. |
| Account settings | Yes | Yes | `/settings/account-settings` | account/preferences/password endpoints | Active settings page. |
| Quick analytics | No | Yes | `/dashboard/quick-analytics` | `/dashboard/quick-analytics` | Full sidebar only. |
| Menu builder | No | Yes | `/menu/builder` | `/menu/*` | Full sidebar only. |
| Recipe editor | No | Yes | `/menu/recipe-editor` | `/menu/recipes*` | Full sidebar only. |
| Prep batches | No | Yes | `/menu/prep-batches` | `/menu/batch_recipes*`, `/prep/batch_recipes*` | Full sidebar only. |
| Inventory table | No | Yes | `/inventory/table` | `/inventory/view`, details/lots/adjustments | Full sidebar only. |
| Stock movements | No | Yes | `/inventory/stock-movements` | `/inventory/stock_movements` | Explicitly wrapped in `TierGatedRoute` for full. |
| Purchase orders | No | Yes | `/inventory/purchase-orders` | `/inventory/purchase_orders*` | Includes suggestions, create-from-suggestions, receiving. |
| Ingredient costing/catalog | No | Yes | `/menu/ingredient-costing` | `/menu/ingredients*`, supplier APIs | Full sidebar only. |
| Suppliers | No | Yes | `/inventory/suppliers` | `/inventory/suppliers*` | Full sidebar only. |
| Prep schedule | No | Yes | `/prep/schedule` | `/prep/schedule*` | Full sidebar only. |
| Prep logs | No | Yes | `/prep/logs` | `/prep/logs` | Full sidebar only. |
| Waste logs | No | Yes | `/prep/waste-logs` | `/prep/waste-logs` | Full sidebar only. |
| Ingredient trends | No | Yes | `/analytics/ingredient-trends` | `/profit_analytics/ingredient_cost_trends` | Full sidebar only. |
| Dish profitability | No | Yes | `/analytics/dish-profitability` | `/profit_analytics/dish_profitability` | Full sidebar only. |
| Waste analytics | No | Yes | `/analytics/waste` | `/waste_analytics/summary` | Full sidebar only. |
| Insights | No | Yes | `/analytics/insights` | mixed analytics APIs | Full sidebar only. |
| Global assistant | Yes | Yes | authenticated shell overlay/floater | `/assistant/query`, `/settings/assistant/*` | Enabled per restaurant settings and requires OpenAI key fallback or restaurant key. |

## Routed But Not Sidebar Features

| Feature | Route | Tier status | Notes |
| --- | --- | --- | --- |
| EOD summary | `/dashboard/eod-summary` | Authenticated route, not in sidebar | Useful for EOD diagnostics but hidden from primary nav. |
| Inventory POS legacy route | `/inventory/pos` | Redirect | Redirects to `/inventory/purchase-orders`. |
| Sales upload wizard mobile route | `sales_upload-wizard` | Mobile route entry | Not part of web sidebar. |

## Code-Resident Or Inactive Features

| Feature | Evidence | Current interpretation |
| --- | --- | --- |
| Team scheduling/clock | `team_routes.py`, team pages/API clients exist, but route not mounted and no active sidebar route. | Not a current product area; treat as legacy/code-resident. |
| Broad admin diagnostics pages | Pages exist for activity logs/system health/system alerts/roles access, but current AppRoutes/sidebar only expose tenant info and users. | Backend endpoints may exist; product surface is inactive. |
| Internal POS/order entry | `/orders` API exists; old internal `/pos` API route file is absent; no current sidebar order-entry page. | Internal POS is not being used; treat as legacy. `/orders` may remain as backend data/API support. |
| Kitchen/waiter surfaces | Mobile API/source references exist, but backend route source and active websocket registration are absent. | Legacy/inactive unless reintroduced. |
| Live operations dashboard | Source component/API exists, but no current web route/sidebar entry. | Code-resident, not active navigation. |

## Tier Vocabulary Rule

Use `basic` and `full` in product-facing docs. Mention `pro` and `master` only when explaining deprecated backend aliases or historical migration context.
