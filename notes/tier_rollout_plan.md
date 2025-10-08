# Prepiq Subscription & POS Rollout Plan

## Objective

Deliver a production-ready platform that supports three subscription tiers (Basic, Pro, Master) and a fully functional POS experience backed by automated forecasting and reordering.

## Tier deliverables

### Basic (current state)

- ✅ Core dashboards (daily overview, alerts) render using basic components.
- ✅ POS basics: order entry, kitchen broadcast, manual completion.
- ⚠️ Needs regression test coverage to lock in existing behaviour before extending tiers.

### Pro (ingredients, batches, advanced prep)

- Backend
  - Harden ingredient/batch CRUD in `inventory_service` and `prep_service` (remove duplicate repo init, unreachable rollbacks, add tier-based guards).
  - Expose missing Pro endpoints (prep schedule, supplier linking, menu ↔ recipe sync) via routers with `check_permissions`.
  - Flesh out `OrderService.get_menu_items` to include recipe/ingredient payloads for Pro devices.
- Frontend & Mobile
  - Build `Pro*` variants for dashboard, sales, admin, and POS components (currently commented placeholders).
  - Add management UIs for ingredients, batch recipes, suppliers, lead times, and prep board.
- Data & Permissions
  - Finish `DEFAULT_ROLES_PRO`/`DEFAULT_PERMISSIONS_PRO` mapping (verify duplicates) and migrate existing tenants.
  - Seed tier-aware demo data for QA.

### Master (automated reordering, advanced insights)

- Automated Reordering
  - Implement Master branch in `EODService.finalize_end_of_day_summary` to run forecasting + `ReorderForecastEngine` and persist generated purchase orders.
  - Close TODOs in reorder engine (ABC classification accuracy, batch suggestions, low-stock alerts) and add unit tests.
  - Connect purchase-order workflow to approvals, vendor notifications, and inventory receiving.
- Analytics & Insights
  - Build out `profit_analytics_service.py` (currently stub) and design Master-grade dashboards (profitability, waste, demand variance) on web + mobile.
  - Add forecast accuracy evaluation and daily snapshots (see unfinished `evaluate_forecast_accuracy`).
- Frontend/Mobile
  - Create Master components for dashboard, alerts, sales, analytics, and POS (advanced KPIs, prescriptive suggestions).

## POS system enhancements

- Unified POS workflow: menu browsing (with modifiers), table/service modes, ticket printing, refunds/voids, receipts.
- Payment integrations: complete Stripe flow (webhooks, retries, tip handling) and add offline capture strategy.
- Device management: finish registration flows, hardware heartbeat, kiosk vs handheld configurations.
- Real-time syncing: ensure order status propagation between `POSService`, `KitchenService`, `OrderService`, and websocket clients.
- Reporting: daily till reconciliation, employee shift summaries, payout exports.

## Cross-cutting production readiness

### Backend

- Formalize tier enforcement via middleware or service guard (most services ignore `subscription_tier`).
- Add validation, error handling, and logging consistency (`InventoryService`, `PrepService`, `EODService`).
- Review schema for constraints (foreign keys, unique indexes, cascading) and run migrations.
- Implement background jobs schedule for EOD per restaurant (ensure idempotency, retries, monitoring).

### Frontend & Mobile

- Convert placeholder components to real Pro/Master experiences; add responsive layouts and accessibility checks.
- Wire TanStack Query caching/invalidation for new APIs.
- Provide onboarding flows for tier upgrades/downgrades.

### Data & Analytics

- Establish analytics warehouse export (sales, inventory, forecasts) for BI.
- Track KPI baselines for Master-tier insights.
- Ensure ingredient/supplier data normalization across imports.

### DevOps & Observability

- CI/CD pipelines: lint, test, build, deploy for backend, frontend, and mobile bundles.
- Environment configuration for Stripe, database, websocket endpoints, and scheduler secrets.
- Centralized logging + metrics (APM, tracing) and alerting for job failures.

### Testing & QA

- Expand automated tests for Pro/Master flows (unit + integration + Playwright).
- Seed fixtures for tier-specific regression suites.
- Create load/performance tests for EOD automation and POS peak hours.

### Master automation deep dive

- Forecasting pipeline
  - `ForecastingEngine` retrains ad-hoc each run with a simple linear regression; no persistence, feature engineering, or seasonal handling. Needs alignment with the richer `ForecastingEngineBasic` (H2O GBM) or a consolidated strategy.
  - Forecast outputs never persist to `forecasts` / `forecast_breakdown` tables (calls commented out), so downstream analytics and accuracy tracking stay empty.
  - Ingredient aggregation assumes unit conversions succeed; missing error handling and unit metadata validation for batches/ingredients (risk of incorrect reorder quantities).
- Inventory statistics
  - `InventoryStatsService` spins up a new forecasting engine on every call, falling back to derived sales if <14 log entries—heavy query cost and duplicated logic. Recommend caching stats per run and injecting a forecasting strategy.
  - Safety stock / MOQ retrievals lack guard clauses for null suppliers, leading to silent defaults that hide data issues.
- Reorder engine
  - `ReorderForecastEngine` ignores tier context, has TODOs for ABC classification accuracy and batch prep suggestions, and returns `Infinity` when max stock missing (needs sensible cap + alert).
  - Low-stock alerts fire but never dedupe; need throttling and severity grading.
  - Suggested orders aren’t written anywhere unless `EODService.write_purchase_orders_to_db()` is called manually; no approval workflow or PO state machine yet.
- End-of-day orchestration
  - `EODService.finalize_end_of_day_summary` only implements the Basic branch; Master path is a stub and never triggers forecasting → reorder → PO write.
  - Spoilage deduction, prep schedule completion, and inventory adjustments are partially implemented with TODO comments (e.g., auto spoilage still blank, error handling missing).
  - Scheduler frequency (60 min) risks overlapping runs without idempotency locks—needs per-restaurant mutexes and run tracking.

## Open questions / approvals

1. Confirm commercial boundary between Pro and Master (e.g., does automated reordering include automatic PO submission or only suggestions?).
2. Define SLA for reordering alerts (real-time vs daily batch).
3. Approve analytics KPI set for Master dashboards (profitability, waste, labour, etc.).
4. Decide on supported hardware for POS (iPad vs Android vs web kiosk) to set integration scope.
