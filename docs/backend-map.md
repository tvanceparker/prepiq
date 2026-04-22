# Backend Map

## Status

This map reflects routers mounted by `main.py`. Route files that exist but are not included in `main.py` are documented as inactive.

## Application Composition

`main.py` creates the FastAPI app, configures CORS, installs `AuthExtractionMiddleware`, includes routers under `/api/v1`, and starts an `AsyncIOScheduler` that calls `app.utils.eod_runner.run_eod_jobs` every 60 minutes.

The normal dependency path is:

```text
get_db -> get_current_user -> build_service(ServiceClass) -> service method
```

`build_service` injects the async DB session, `restaurant_id`, backend `subscription_tier`, and `employee_id`. The active tier vocabulary is `basic/full`; old `pro/master` values normalize to `full`.

## Mounted Route Groups

| Prefix | Route module | Main service(s) | Current role |
| --- | --- | --- | --- |
| `/auth` | `auth_routes.py` | `AuthService` | Login, refresh, logout, current user, device registration. |
| `/dashboard` | `dashboard_routes.py` | `DashboardService` | Daily overview, sales uploads, menu item quick entry, live/quick analytics endpoints. |
| `/sales_forecast` | `sales_forecast_routes.py` | `SalesForecastService` | Forecast state, upcoming forecast, menu mix, accuracy, sales patterns, explorer, sales edits. |
| `/menu` | `menu_routes.py` | `MenuService` | Menu items, categories, ingredients, recipes, batch recipes, usage checks. |
| `/inventory` | `inventory_routes.py` | `InventoryService` | Inventory view/details, stock movements, suppliers, lots, adjustments, PO lifecycle, reorder suggestions. |
| `/prep` | `prep_routes.py` | `PrepService` | Prep logs, waste logs, schedules, batch recipe CRUD/usage. |
| `/profit_analytics` | `profit_analytic_routes.py` | `ProfitAnalyticsService` | Sales/profit lookups, ingredient cost trends, dish profitability. |
| `/waste_analytics` | `waste_analytics_routes.py` | `WasteAnalyticsService` | Waste summary analytics. |
| `/alerts` | `alert_routes.py` | `AlertsService` | Alert creation, active/all alerts, acknowledge, resolve, fix, active count. |
| `/settings` | `settings_routes.py` | `SettingsService`, `POSIntegrationService` | Restaurant/account settings, assistant settings, POS mode/OAuth/status/sync. |
| `/admin` | `admin_routes.py` | `AdminService` | Tenant info, diagnostics, roles/permissions, employees. |
| `/orders` | `orders_routes.py` | `OrderService` | Order/menu/order status APIs. Active backend, not current sidebar. |
| `/webhooks/pos` | `pos_webhooks.py` | `POSIntegrationService` | Square webhook handler; Toast/Clover placeholders return not implemented. |
| `/pos/mappings` | `pos_mappings_routes.py` | `POSIntegrationService` | POS item mapping APIs. Mounted, but likely has a CurrentUser object/dict bug. |
| `/eod` | `eod_routes.py` | `EODService` | EOD summary and manual finalize trigger. |
| `/assistant` | `assistant_routes.py` | `AssistantService` | Read-only assistant query endpoint. |

## Route Files Not Mounted

| Route module | Prefix | Evidence and interpretation |
| --- | --- | --- |
| `team_routes.py` | `/team` | File exists and clients have team API/page code, but `main.py` does not include the router. Team/timekeeping is not a current product area. |
| `permission_routes.py` | `/permissions` | File exists but is not included in `main.py`; permissions are mostly reachable through `/admin` today. |

Older docs mention `kitchen_routes`, `waiter_routes`, and `pos_routes`. Those source files are not present in the current `app/api/v1` tree, so they should not be treated as active REST APIs.

## Service Boundaries

| Service | Responsibility | Important notes |
| --- | --- | --- |
| `AuthService` | Employee authentication, JWT creation, refresh cookies, device registration. | Backend device registration route is `/auth/register-device`. |
| `DashboardService` | Daily overview, sales uploads, conflict checks, menu item quick entry, quick analytics. | Upload flow writes `sales` rows and can overwrite by date/channel. |
| `SalesForecastService` | Forecast state, sales analytics, upcoming forecasts, accuracy, full-tier menu-mix analytics. | Some endpoint paths still use deprecated `_pro` names, but guards use full-tier normalization. |
| `MenuService` | Menu items, ingredients, suppliers, recipes, nested recipe references, batch recipes. | Recipe graph validation prevents cycles. |
| `InventoryService` | Inventory, lots, suppliers, POs, stock movements, discrepancies, reorder suggestions. | Large orchestration service; reorder generation uses forecast state and policy-aware helpers. |
| `ReorderForecastEngine` | Policy/cadence-aware reorder math. | Uses policy types such as `fresh_perishable`, `stable_stocked`, `recipe_dependent`, and `intermittent_low_turn`. |
| `EODService` | EOD orchestration and ledgers. | Coordinates sales deduction, forecasts, reorder checks, PO suggestions, and summary state. |
| `PrepService` | Prep schedules/logs, waste logs, batch recipe operations. | Full-tier surface in clients. |
| `ProfitAnalyticsService` | Ingredient cost trends and dish profitability. | Used by full analytics pages. |
| `WasteAnalyticsService` | Waste summary analytics. | Used by waste analytics page. |
| `AlertsService` | Alert lifecycle. | Active count feeds global layout. |
| `SettingsService` | Restaurant, account, preferences, assistant settings, POS mode. | Assistant key storage is encrypted and not returned to clients. |
| `AdminService` | Tenant info, diagnostics, roles, permissions, employee management. | Some admin endpoints are active but pages are not in sidebar. |
| `OrderService` | Order creation/status/menu support. | Active backend, but no current sidebar order-entry page. |
| `POSIntegrationService` | External POS OAuth/sync/webhooks/mappings. | Square is implemented; Toast/Clover are placeholders. |
| `AssistantService` | Query routing, live context assembly, docs retrieval, answer generation. | Phase 1 read-only assistant over docs/notes plus selected live state. |
| `TeamService` | Clock events, shifts, team scheduling. | Code exists, but team/timekeeping is not a current product area and route is not mounted. |

## Background And Integration Work

- EOD scheduler: `app.utils.eod_runner.run_eod_jobs`, hourly from the FastAPI lifespan.
- Forecast engines: `ForecastingEngine`, `ForecastingEngineBasic`, related helpers.
- Reorder policy engine: `app/services/helpers/reorder_forecast_engine.py` and companion helpers.
- External POS: Square provider is wired through `POSIntegrationService`; Toast and Clover providers are present but not active providers.
- Weather: forecast logic uses weather support modules and Open-Meteo integration.
- Assistant: `AssistantRetriever` scans `docs/` and `notes/` in process; no vector store is active yet.

## Known Backend Mismatches

- `pos_mappings_routes.py` treats `current_user` as a dictionary, while `get_current_user` returns a `CurrentUser` object. The mounted endpoints may fail until this is corrected.
- `team_routes.py` and `permission_routes.py` are not mounted; team/timekeeping is out of scope for the current product.
- Source files for the old internal `/pos`, kitchen REST, waiter REST, and websocket route registration described in older docs are absent or no longer wired in `main.py`.
- Product docs should say `basic` and `full`; `pro` and `master` are deprecated aliases that normalize to `full`.
