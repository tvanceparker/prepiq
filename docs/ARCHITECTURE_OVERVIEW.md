# Architecture Overview

## Purpose

PrepIQ is a multi-tenant restaurant operations platform built as a monorepo with three primary application surfaces:

- FastAPI backend in `app/`
- React web client in `frontend/`
- React Native mobile client in `mobile/`

The backend is the system of record for tenant-scoped restaurant data, operational workflows, and integrations. The web and mobile clients consume the same backend contracts and should remain aligned to the same DTOs and business rules.

## Monorepo Structure

```text
prepiq/
├── app/                  # FastAPI backend
├── frontend/             # React web client
├── mobile/               # React Native mobile client
├── tests/                # Backend and e2e tests
├── scripts/              # Migrations, backfills, seed helpers
├── docs/                 # Technical documentation
├── AGENTS.md             # High-level repo orientation
└── .github/copilot-instructions.md
```

## Backend Request Flow

The default backend flow is:

```text
route -> dependency -> service -> repository -> ORM model -> database
```

The main implementation points are:

- `main.py` registers middleware, routers, websocket routes, and the scheduler.
- `app/api/v1/*_routes.py` exposes domain endpoints.
- `app/api/dependencies.py` builds tenant-aware services.
- `app/services/*_service.py` contains business logic and orchestration.
- `app/repositories/*_repo.py` contains tenant-scoped persistence logic.
- `app/db/models/*_orm.py` defines ORM models.

## Tenant Model

PrepIQ is tenant-scoped by restaurant.

- `restaurant_id` is a required part of normal application data access.
- `CurrentUser` is built from the JWT in `app/api/dependencies.py` and carries `restaurant_id`, `subscription_tier`, and `employee_id`.
- Repositories should inherit from `BaseRepository` and receive `db` plus `restaurant_id` in the constructor.
- Normal application queries should not bypass tenant filtering.

This is the most important architecture constraint in the backend.

## Authentication And Context

Authentication is JWT-based.

- The auth middleware and dependencies decode the token and populate user context.
- Backend services are usually built through `build_service(...)`, which injects:
  - `db`
  - `restaurant_id`
  - `subscription_tier`
  - `employee_id`
- Frontend stores auth context and token in local storage.
- Mobile mirrors the same backend auth and tier-aware access patterns.

## Core Backend Domains

The current backend is organized around these major operational domains:

- Authentication and user context
- Dashboard and restaurant overview
- Sales and forecasting
- Menu, recipes, and ingredients
- Inventory, suppliers, and purchase orders
- Prep schedules and waste logging
- Alerts and diagnostics
- Team scheduling and clock events
- Admin and tenant configuration
- Internal POS, cash drawer, terminal readers, and external POS integration
- End-of-day orchestration and forecasting pipelines

## Current Service Layer

The current service layer includes:

- `AuthService`
- `DashboardService`
- `SalesForecastService`
- `MenuService`
- `InventoryService`
- `InventoryStatsService`
- `PrepService`
- `ProfitAnalyticsService`
- `WasteAnalyticsService`
- `AlertsService`
- `TeamService`
- `SettingsService`
- `AdminService`
- `OrderService`
- `InternalPOSService`
- `KitchenService`
- `EODService`
- `ForecastingEngine`
- `ForecastingEngineBasic`
- `ReorderForecastEngine`

## Runtime Composition

`main.py` composes the application with:

- FastAPI app creation
- CORS configuration
- auth extraction middleware
- router registration under `/api/v1`
- websocket registration for kitchen and POS surfaces
- `AsyncIOScheduler` startup for EOD execution

## Scheduler And Background Processing

The backend includes scheduled end-of-day orchestration via APScheduler.

- `run_eod_jobs` is registered during application lifespan.
- Restaurants carry operating context such as timezone and EOD behavior in the `restaurants` table.
- Forecast freshness and purchase-order suggestion behavior now depend on explicit forecast state rather than silent fallback alone.

## Web Architecture

The web app is React-based and uses:

- React Router for page routing
- protected routes and tier-gated routes
- shared interfaces under `frontend/src/interfaces/`
- feature pages under `frontend/src/pages/`
- colocated hooks for non-trivial page logic

The main route groups include:

- Dashboard
- Sales
- Menu
- Inventory
- Prep
- Analytics
- Admin
- Settings

## Mobile Architecture

The mobile app is React Native-based and uses:

- React Native Paper
- navigation defined under `mobile/src/navigation/`
- a tier-aware sidebar model similar to the web app
- shared domain interfaces and API clients under `mobile/src/`

The current mobile navigation normalizes product access into `basic` and `full` experiences.

## Integrations

Current integration surfaces include:

- Square external POS support
- provider abstraction for future POS integrations
- weather and forecast-supporting operational data
- Stripe terminal and cash drawer flows for internal POS mode

## Legacy And Internal Surfaces

Some subsystems still exist in the repo but should not be treated as the default v1 product direction unless a task explicitly targets them.

These include:

- internal POS and device-bound terminal flows
- kitchen realtime and waiter-oriented operational flows
- granular permission expansion beyond the shared-access v1 model
- older tier naming and broader internal-ops assumptions left in legacy code paths

These surfaces are still real parts of the codebase, but retrieval and documentation should prioritize the current v1 restaurant operations model first.

## Documentation Boundaries

This document is the top-level architecture map. More detailed behavior belongs in the focused docs:

- `DATA_MODEL.md`
- `SERVICES_INDEX.md`
- `API_SURFACES.md`
- `FEATURE_TIERS.md`
- `FORECASTING_SYSTEM.md`
- `INVENTORY_DEDUCTION_AND_PO.md`
- `ASSISTANT_RAG_MCP_ROADMAP.md`
