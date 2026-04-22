# System Overview

## Status

This is a RAG-oriented system map generated from the current code wiring. Prefer it over older broad summaries when answering "what exists now" questions.

## What PrepIQ Is

PrepIQ is a multi-tenant restaurant operations platform. It connects sales history, POS/manual sales import, menu and recipe structure, inventory, prep work, purchase orders, alerts, and forecasting into one planning system.

The backend is the system of record. The web and mobile clients are tier-aware clients over the same `/api/v1` backend. MySQL stores tenant-scoped operational data. The current assistant reads curated docs and selected live backend state for restaurant-scoped Q&A.

## Major Runtime Surfaces

| Surface | Location | Current role |
| --- | --- | --- |
| FastAPI backend | `main.py`, `app/` | Auth, tenant context, services, routes, scheduled EOD, POS integrations, assistant query endpoint. |
| Web client | `frontend/` | Primary operator UI, routed through `frontend/src/routes/AppRoutes.tsx` and `frontend/src/components/data/sidebarData.js`. |
| Mobile client | `mobile/` | Mobile operator UI with route/sidebar parity for most active web surfaces. |
| Database | `app/db/models/*_orm.py`, `scripts/migrations/` | MySQL schema, ORM models, SQL migrations and seeds. |
| Assistant retrieval corpus | `docs/`, `notes/` | Current simple document retrieval source for the assistant. |

## Core Product Domains

| Domain | Backend sources | Client surfaces | Notes |
| --- | --- | --- | --- |
| Auth and tenancy | `auth_routes.py`, `AuthService`, `dependencies.py`, `middleware.py` | Login screens, auth contexts | JWT carries `restaurant_id`, subscription tier, employee identity, and optional role. Target tier values are `basic/full`. |
| Dashboard | `dashboard_routes.py`, `DashboardService` | Daily overview, alerts, menu item entry, quick analytics | Also contains sales upload/template helpers. Some dashboard code, such as live operations, is code-resident but not currently routed. |
| Sales and forecasting | `sales_forecast_routes.py`, `SalesForecastService`, forecast engines | Upcoming forecast, menu mix, accuracy, patterns, explorer | Basic/full clients both expose sales pages. The full menu mix path still uses legacy pro-named endpoint paths, but tier guards use full-tier normalization. |
| Menu and recipes | `menu_routes.py`, `MenuService` | Menu builder, recipe editor, prep batches, menu item entry | Recipes support ingredient, batch, and recipe references with cycle validation. |
| Inventory and purchasing | `inventory_routes.py`, `InventoryService`, reorder helpers | Inventory table, stock movements, purchase orders, ingredient costing, suppliers | Full-tier UI surface. Includes lots, adjustments, stock movement history, PO suggestions, receiving, and discrepancy tracking. |
| Prep and waste | `prep_routes.py`, `PrepService`, `waste_analytics_routes.py` | Prep schedule, batch recipes, prep logs, waste logs, waste analytics | Prep and waste are full-tier sidebar surfaces. |
| Analytics | `profit_analytic_routes.py`, `waste_analytics_routes.py`, `sales_forecast_routes.py`, `dashboard_routes.py` | Ingredient trends, dish profitability, waste, insights | There is no single backend `/analytics` prefix. Analytics is split by domain routes. |
| Alerts | `alert_routes.py`, `AlertsService` | Alerts feed and global alert badge | Active count drives the layout badge. Alerts can be acknowledged, resolved, and fixed. |
| Admin and settings | `admin_routes.py`, `settings_routes.py`, services | Tenant info, user management, restaurant/account/integration settings | Some admin pages exist in source but are not active sidebar/AppRoutes entries. |
| EOD orchestration | `eod_routes.py`, `EODService`, `eod_runner.py` | Hidden `/dashboard/eod-summary`, scheduler output | Scheduler runs hourly and finalizes tenant EOD summaries when due. |
| POS and order integrations | `pos_webhooks.py`, `pos_mappings_routes.py`, `orders_routes.py`, `POSIntegrationService`, `OrderService` | Settings integration UI; no active order/POS sidebar page | Square external POS integration is real. Internal POS is not being used right now. |
| Assistant | `assistant_routes.py`, `AssistantService`, helper modules | Global web floater, global mobile overlay, integration settings | Phase 1 read-only assistant uses docs/notes retrieval plus selected live structured context. |

## Tier Model

The current product-facing clients use two tiers:

- `basic`
- `full`

The backend database and some service guards still contain older raw tier values:

- `basic`
- `pro`
- `master`

Migration status: backend storage, guards, seeds, and JWT-facing tier handling are being moved to `basic/full`. The code now normalizes old `pro` and `master` values to `full`, and `scripts/migrations/0018_migrate_subscription_tier_to_full.sql` migrates stored restaurant tiers. RAG answers should say that the product surface is `basic`/`full`; `pro` and `master` are deprecated aliases, not active tiers.

## Request And Data Flow

Normal backend request flow:

```text
HTTP route -> dependency -> service -> repository or direct query -> ORM model -> MySQL
```

Normal web/mobile flow:

```text
sidebar/AppRoutes entry -> page component -> colocated hook/API wrapper -> /api/v1 route -> service -> database
```

Important authoritative files:

- Active backend route mounting: `main.py`
- Active web navigation: `frontend/src/components/data/sidebarData.js`
- Active web routability: `frontend/src/routes/AppRoutes.tsx`
- Active mobile navigation: `mobile/src/navigation/sidebarData.ts` and `mobile/src/navigation/routes.tsx`
- Backend contracts and business behavior: `app/api/v1/*_routes.py`, `app/services/*`
- Schema: `app/db/models/*_orm.py` plus `scripts/migrations/`

## Active Versus Code-Resident

Do not treat file existence as product availability.

Some code exists but is not part of the current active product surface. Team/timekeeping and internal POS are explicitly not current product areas. Broader admin pages, live operations pages, kitchen/waiter mobile APIs, and terminal/cash-drawer remnants should also be treated as low-priority legacy or code-resident material. See `gaps-and-legacy.md` for the audit list and evidence.
