# Core Workflows

## Status

These workflows are inferred from active route registration, frontend navigation, API wrappers, services, and ORM relationships.

## Login, Auth, And Tenant Context

1. Web/mobile login posts employee credentials to `/api/v1/auth/login`.
2. `AuthService` validates the employee, loads the restaurant subscription tier, and returns an access token. The refresh token is stored in an HTTP-only cookie on web.
3. `AuthExtractionMiddleware` decodes bearer tokens opportunistically and stores request state.
4. `get_current_user` decodes the JWT for protected endpoints and returns `restaurant_id`, backend `subscription_tier`, `employee_id`, and role data. The target tier values are `basic/full`.
5. Service dependencies use `build_service` to inject tenant context into service classes.

Client contexts normalize any raw non-`basic` tier to product tier `full`.

## Navigation And Tier Resolution

1. Authenticated web pages render through `Layout`.
2. `Sidebar` chooses `sidebarDataByTier.basic` or `sidebarDataByTier.full`.
3. `AppRoutes` determines whether a route actually renders.
4. Most tier visibility is sidebar-driven; only a small number of routes use `TierGatedRoute`.

For RAG, answer feature availability from sidebar plus AppRoutes, not page filenames alone.

## Manual Sales Upload And Sales Entry

1. Basic dashboard exposes sales template download and upload/manual sales entry flows.
2. Dashboard API wrappers call `/dashboard/download_sales_template`, upload, manual sales, and conflict-check endpoints.
3. `DashboardService` validates required sales fields such as menu item ID/name, quantity sold, timestamp, and optional sales channel.
4. Conflict checks compare incoming date/channel data against existing `sales` rows.
5. Uploads write or overwrite `sales` rows depending on the request.
6. Forecast/EOD processes later use those sales rows.

## External POS Connection And Sync

1. Integration settings expose POS mode, OAuth start/callback/status, and sync actions through `/settings/pos/*`.
2. `SettingsService` and `POSIntegrationService` store provider state on the restaurant and merchant mapping tables.
3. Square is the implemented provider. Toast and Clover endpoints/providers are placeholders or not implemented.
4. POS webhooks arrive under `/webhooks/pos/square`.
5. POS sync/mapping can map external item IDs to PrepIQ menu items.

Known caveat: `/pos/mappings` is mounted, but its route code likely mishandles `CurrentUser` as a dictionary.

## Menu, Recipe, And Ingredient Setup

1. Quick menu item entry exists on the basic dashboard.
2. Full-tier menu builder and recipe editor use `/menu` APIs.
3. Ingredients can be upserted with supplier links and replenishment policy fields.
4. Recipes can reference ingredients, batch recipes, or other recipes.
5. `MenuService` validates nested references and prevents cycles.
6. Menu-item-to-recipe relationships drive cost, forecast breakdown, and inventory deduction behavior.

## Forecasting And Forecast State

1. Sales history is stored in `sales`.
2. Forecast engines generate rows in `forecasts` and breakdown tables.
3. Forecast runs are tracked by `forecast_run_ledger`.
4. `SalesForecastService.get_forecast_state` reports ready/stale/degraded/failed state using restaurant EOD state and forecast ledger data.
5. Sales pages consume `/sales_forecast` endpoints for upcoming demand, menu mix, accuracy, patterns, and explorer tables.

Full-tier menu mix currently uses legacy pro-named backend endpoint paths, but the guards use full-tier normalization.

## End Of Day

1. The FastAPI lifespan starts an hourly scheduler for `run_eod_jobs`.
2. The runner evaluates active restaurants and their operating context.
3. `EODService` finalizes the day when due.
4. EOD orchestration can deduct sales from inventory, run forecast steps, evaluate reorder needs, create/store PO suggestions, and update ledgers.
5. EOD state is persisted in `eod_run_ledger` and restaurant `last_eod_run_date` fields.
6. `/eod/summary` and the hidden EOD summary page expose diagnostic status.

## Inventory Updates And Deduction

Inventory changes can come from several workflows:

- manual stock adjustment
- setting current stock
- receiving purchase orders into lots
- sales/EOD deduction from recipes
- used/wasted logs

`InventoryService` maintains inventory rows, lot rows, usage logs, stock movement views, and deduction discrepancy history. Lot-aware behavior matters because available quantity can differ from total stock if stock is expired, used, or lot-limited.

## Reorder Generation And Purchasing

1. Ingredient/supplier rows define costs, lead time, review period, delivery cadence, shelf life, preference, and ordering constraints.
2. Forecast state determines whether reorder generation uses cached EOD demand or fresh forecast computation.
3. `InventoryService.generate_purchase_order_suggestions` uses `ReorderForecastEngine` and policy helpers.
4. Suggestions include forecast trust metadata and can be turned into draft purchase orders.
5. Purchase orders can be edited, statused, received, and converted into inventory lots/stock movement records.

Policy types include fresh perishable, stable stocked, recipe dependent, and intermittent low-turn behavior.

## Prep And Waste

1. Full-tier prep routes expose schedule, batch recipes, prep logs, and waste logs.
2. Prep APIs store scheduled tasks and execution logs.
3. Waste logs feed waste analytics.
4. Batch recipes connect prep planning to ingredient demand and menu production.

## Reporting And Analytics

Analytics are split by backend domain:

- dashboard quick analytics from `/dashboard`
- sales analytics from `/sales_forecast`
- ingredient cost trends and dish profitability from `/profit_analytics`
- waste summaries from `/waste_analytics`

There is no backend `/analytics` prefix.

## Alerts

1. Services create alerts for operational issues.
2. The alerts feed reads active and historical alert data.
3. The layout badge calls `/alerts/active_count`.
4. Operators can acknowledge, resolve, or invoke fix flows for alerts.

## Admin And Settings

Active admin UI includes tenant info and user management. Backend routes also expose diagnostics, activity logs, roles, permissions, and checks, but several corresponding admin pages are not active sidebar entries.

Settings cover restaurant settings, account info, preferences, password/email/phone changes, assistant settings, and POS integration mode/status/sync.

## Assistant Query Flow

1. Authenticated web and mobile clients render a global assistant entry point.
2. Query requests post to `/assistant/query`.
3. `AssistantService` checks restaurant assistant settings and resolves the OpenAI key from encrypted restaurant storage or environment fallback.
4. The query router chooses document, structured, or blended retrieval.
5. `AssistantContextBuilder` gathers selected live context for alerts, forecasts/sales, EOD, purchase orders/reorders, and inventory.
6. `AssistantRetriever` scans `docs/` and `notes/`, chunks markdown/text, reranks, expands neighbors, and sends context to the OpenAI client.
7. Phase 1 is read-only and does not execute write actions.
