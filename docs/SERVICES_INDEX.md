# Services Index

## Purpose

This document maps the current backend service layer to its primary responsibility.

It is intended to answer:

- where business logic currently lives
- which services matter for major product areas
- which services are likely retrieval sources for future assistant features

For mounted route/service status, use `backend-map.md` as the current source of truth. This index includes some code-resident services that may not be active product surfaces.

## Tenant-Aware Service Pattern

Most application services are created through `build_service(...)` and receive:

- `db`
- `restaurant_id`
- `subscription_tier`
- `employee_id`

This is the standard service shape for tenant-aware application logic.

## Core Application Services

### AuthService

Purpose:

- login and authentication flows
- credential handling and token creation
- user session entry into the platform

### DashboardService

Purpose:

- daily overview and high-level operational views
- quick analytics and live operations summaries
- top-level dashboard aggregation across domains

### SalesForecastService

Purpose:

- operator-facing sales and forecast endpoints
- forecast table, totals, top items, and accuracy views
- explicit forecast-state output including status, source, freshness, and confidence

### MenuService

Purpose:

- menu items, recipes, ingredients, supplier-linked ingredient data
- recipe usage and editor-backed CRUD flows

### InventoryService

Purpose:

- inventory views and adjustments
- supplier relationships
- stock movement and lot-level workflows
- purchase order lifecycle
- PO suggestion generation and forecast-linked review context

### InventoryStatsService

Purpose:

- average usage, variability, lead time, shelf life, MOQ, and stock-level inputs
- support for reorder and ABC logic

### PrepService

Purpose:

- prep schedules and logs
- waste logs
- batch recipe creation, update, deletion, and usage views

### ProfitAnalyticsService

Purpose:

- profitability and cost-oriented analytics
- dish profitability and ingredient cost trend views

### WasteAnalyticsService

Purpose:

- waste summary analytics and operational waste insights

### AlertsService

Purpose:

- alert creation, listing, active filtering, acknowledgment, and resolution
- system- and workflow-level operator notifications

### TeamService

Purpose:

- employee management
- shifts, schedule views, schedule updates
- clock events and staffing insights

Current status:

- team/timekeeping is not a current product area
- code-resident, but `team_routes.py` is not mounted in `main.py`
- do not treat team scheduling as an active API surface

### SettingsService

Purpose:

- restaurant settings and preference updates
- POS mode configuration and integration settings coordination

### AdminService

Purpose:

- tenant-level administrative views
- activity logs and validation/check endpoints
- role and permission-related admin data surfaces

### OrderService

Purpose:

- order orchestration beyond raw POS routing
- shared order logic used by POS-oriented workflows

### InternalPOSService

Purpose:

- internal POS operations
- device registration and settings
- order creation and completion
- cash drawer and terminal-related flows

Current status:

- not being used right now; legacy or removed surface in current source wiring
- broad internal `/pos` routes are not mounted in `main.py`
- active POS work is primarily external POS integration through settings/webhooks/mappings plus the `/orders` API

### KitchenService

Purpose:

- kitchen-oriented operational flows and realtime support

Current status:

- legacy or removed surface in current source wiring
- active backend route modules for kitchen/waiter were not found during the current audit

## Forecasting And EOD Engines

These are service-layer engines rather than simple CRUD services.

### EODService

Purpose:

- end-of-day orchestration per restaurant
- forecasting, inventory, accuracy, and operational pipeline coordination
- ledger-backed status behavior and EOD summary output

### ForecastingEngine

Purpose:

- advanced forecast generation
- confidence scoring and breakdown generation
- forecast run ledger integration

### ForecastingEngineBasic

Purpose:

- lighter forecasting path and fallback behavior

### ReorderForecastEngine

Purpose:

- cadence-aware reorder policy evaluation
- safety stock, reorder point, and supplier timing logic
- reorder suggestion math that can separate ingredient policy from supplier cadence

### AssistantService

Purpose:

- read-only assistant query orchestration
- assistant settings enforcement and OpenAI key resolution
- query routing across document, structured, and blended retrieval
- document retrieval over `docs/` and `notes/`
- selected structured live context from existing services

## Helpers And Utilities Worth Knowing

Important helper/service-adjacent areas include:

- POS integration helpers under `app/services/helpers/`
- purchase order note helpers under `app/services/utils/`
- inventory deduction helpers under `app/services/utils/`
- permission utilities for role-aware checks

## Assistant Integration Guidance

The current phase 1 assistant already uses selected live operational retrieval. The strongest retrieval targets are:

- `SalesForecastService`
- `InventoryService`
- `MenuService`
- `PrepService`
- `AlertsService`
- `SettingsService`

For deeper analytics or pipeline introspection, it may also need:

- `EODService`
- `ForecastingEngine`
- `ReorderForecastEngine`
- `InventoryStatsService`

The assistant should prefer normalized service outputs over direct interpretation of arbitrary backend code.

Because team/timekeeping is not a current product area, do not use `TeamService` as assistant context.
