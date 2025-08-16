## PrepIQ — Basic Tier Roadmap & To-do

Purpose: capture a clear, actionable plan to finish and ship the Basic tier of PrepIQ. This document focuses exclusively on the Basic tier: reliable EOD runs, sales upload, forecasting, dashboard UX, testing, and a plan for later mobile/PRO features. Use this as a working checklist — edit, comment, and mark items done as you complete them.

---

### 1) Goals for Basic tier (MVP)
- Reliable End-Of-Day pipeline that never crashes on sparse data
- Sales upload UI + server parsing/validation
- Forecasting engine with ML + deterministic fallback
- Persisted forecasts & breakdowns with dashboard views
- Authentication + tenant scoping + basic permissions
- Minimal observability: logs for EOD, per-item decisions, and errors
- Frontend UX polish: density toggle, sparklines, skeletons
- Documentation and seed data for onboarding (restaurant_id=2)

---

### 2) Hardening & Reliability (highest priority)
- [ ] Add deterministic fallback forecasting in `forecasting_engine_basic.py` (moving average / last-N mean) when training is skipped or fails
  - Why: prevents EOD from producing holes and avoids H2O failures on tiny datasets
  - Where: `app/services/forecasting_engine_basic.py::train_model` and `generate_forecast` path where `model is None`

- [ ] Catch-and-log all training errors and ensure `run` returns per-item results instead of raising
  - Ensure logs include menu_item_id, restaurant_id, reason (insufficient rows / exception)

- [ ] Add a lightweight `should_retrain_model` guard (already present) and centralize the MIN_ROWS threshold in a config constant

- [ ] Add unit tests for forecasting service
  - Tests: small-dataset returns fallback and metrics; normal dataset returns model or predictions
  - Place: `tests/services/test_forecasting_engine_basic.py`

- [ ] Add an integration smoke test for EOD flow (using seeded DB)
  - Run a small E2E that runs `eod_service.finalize(eod_date, restaurant_id=2)` and asserts forecast rows created

- [ ] Add retry / idempotency for EOD background job
  - Make sure repeated runs don't double-insert forecasts for same date/version

- [ ] Integrate external signals: weather & traffic into forecasting pipeline
  - Add DB tables: `weather_data` and `traffic_data` (indexed by `restaurant_id, date`)
  - Create repositories `WeatherRepository` and `TrafficRepository` and simple ingestion adapters under `app/integrations/weather` and `app/integrations/traffic`
  - Add a nightly/seed ingestion job to backfill historical weather & traffic for seeded restaurants
  - Where used: merge these signals into `train_model` feature set and `generate_forecast` feature engineering


---

### 3) Observability & Safety
- [ ] Improve EOD logs: structured logs for each item: `{menu_item_id, rows, action: trained|fallback|skipped, metrics}`
- [ ] Emit high-level EOD summary (counts trained/fallback/skipped, duration, errors)
- [ ] Add alerts for repeated failures (e.g., > 5 items skipped for > 3 runs)
- [ ] Ensure `logs/app.log` rotation and retention configured

- [ ] Log external data completeness and freshness (weather/traffic) per restaurant and expose as alert when coverage < 80% for the lookback window


---

### 4) Backend Code & Tests (practical tasks)
- [ ] Centralize config constants (e.g., `MIN_ROWS_FOR_H2O=20`) in a module or service config
- [ ] Add unit tests for services: forecasting, upload parsing, sales repo helpers
- [ ] Add DB seed script for Basic demo (restaurant_id=2 already available; expand README)
- [ ] Add API integration test that asserts `sales-upload-template` header and content
- [ ] Add OpenAPI/type generation for critical endpoints (dashboard, forecasts, auth) — allow generating TS types for frontend

- [ ] Add DB migrations for `weather_data` and `traffic_data` tables and simple models under `app/db/models`
- [ ] Add `WeatherRepository` and `TrafficRepository` and unit tests for their data joins
- [ ] Add ingestion adapters for at least one free weather API (OpenWeatherMap) and a traffic proxy (or synthetic traffic index) and a backfill script


---

### 5) Frontend — Basic Dashboard polish
- [ ] Add density toggle (compact / comfortable) that maps to theme spacing tokens
  - Implementation: small toggle near DateSelector that sets a `density` state and changes padding/margins across cards
- [ ] Add Sparkline component (small SVG) and wire into `SummaryCard` and Top Items
- [ ] Replace global spinner with skeletons per-card and per-list
- [ ] Ensure download/upload uses server filename and fallback (already implemented) and show toast on success/failure
- [ ] Accessibility pass: color contrast checks, aria-labels for toggles/buttons, keyboard nav on modals
- [ ] Move shared small components into `frontend/src/components/atoms` and `molecules`

---

### 6) Frontend — Tests & Delivery
- [ ] Add storybook / visual sandbox for custom components (Sparkline, SummaryCard variants) — helps create the "wow" layer
- [ ] Write a Playwright smoke test for dashboard download/upload and a basic flow of EOD API call (using mocked API)
- [ ] Add a small CI job: `frontend build`, `eslint`, and `playwright` smoke checks (light)

---

### 7) UX / Product considerations (Basics first)
- Ship Basic first — proves core value: automatic forecasts from sales history
- Keep Pro/Master as vertical slices/feature flags so you can add recipe linking and reordering later without a rewrite
- Keep feature gating at service/router level using `subscription_tier` or `permissions`

---

### 8) Mobile / React Native (plan & notes)
Goal: a small Expo app that reuses API + shared JS utilities; deliver a Dashboard screen and Alerts view for owners/managers.

- [ ] Create `mobile/` or `packages/mobile` using Expo (managed workflow)
  - Reuse pure JS modules: `frontend/src/api/*`, `frontend/src/utils/*`, date helpers, and shared tokens
- [ ] Charts: use `react-native-svg` + `victory-native` or a small custom sparkline (SVG/ART) to reuse visuals
- [ ] Auth: use SecureStore/Keychain for tokens and implement refresh logic similar to web
- [ ] File upload/download: mobile requires document picker and upload flow; postpone advanced upload until necessary
- [ ] Timeline: RN prototype (login + dashboard) in ~3–6 weeks once API is stable

Notes: don't attempt to replicate every web interaction in RN — focus on 1–2 core flows for MVP (view forecasts, alerts, sign-in)

---

### 9) POS & Integrations (design, not implementation yet)
- [ ] Design a POS adapter spec (webhook + batch uploads + connector interface)
  - POST /api/v1/integrations/pos/ingest — accepts batched sales with external ids
- [ ] Provide import utilities: CSV mapping templates and a simple SDK/guide to map POS fields to your sales table
- [ ] Consider building a small PrepIQ POS later if uptake requires tight integration

---

### 10) Release checklist for Basic MVP
- [ ] All core EOD flows run on seeded data for 30 days without unhandled exceptions
- [ ] Automated tests for forecasting service + EOD smoke test pass in CI
- [ ] Frontend: density toggle + sparklines + skeletons implemented and QA'd
- [ ] Documentation: README for onboarding a new restaurant (seed data, sample CSV, how to run EOD)
- [ ] Monitoring: logs aggregated and simple alerting for EOD failures
- [ ] Deployment: a deployable build for web and a runbook for backend (uvicorn/uvicorn systemd or container)

---

### 11) Prioritized short backlog (next 10 tasks)
1. Implement moving-average fallback in `forecasting_engine_basic.py` (+ unit tests)
2. Add EOD structured logging for per-item decision and overall summary
3. Add skeleton loaders per card in `BasicOverview` and `SalesUploadModal`
4. Add Sparkline component and wire into SummaryCard and Top Items
5. Add density toggle and apply to a few high-impact components
6. Add DB tables + repos for `weather_data` and `traffic_data` and an ingestion/backfill job
7. Wire weather/traffic features into `train_model` feature engineering and add tests
6. Add an integration test that calls `GET /api/v1/dashboard/sales-upload-template` and verifies header
7. Add OpenAPI → TS types generation for dashboard endpoints
8. Add seed scripts and a README onboarding doc for a demo restaurant
9. Add CI pipeline for backend tests + frontend build
10. Sketch Expo scaffold and shared JS module plan for mobile

---

### 12) How we’ll use this doc
- Treat this as the single truth for Basic tier work. Update items as you complete them.
- For each implementation, add a minimal PR and reference the checklist items that PR completes.
- If scope creeps to Pro/Master for a paying customer, add a new section `Pro Pilot` and keep Basic as stable baseline.

---

Notes & links
- Use `restaurant_id=2` seed data when running tests and EOD smoke runs locally.
- Key files to edit: `app/services/forecasting_engine_basic.py`, `app/api/v1/dashboard_routes.py`, `frontend/src/pages/dashboard/components/BasicOverview.jsx`, `frontend/src/theme.js`

If you want, I can start by implementing item #1 (moving-average fallback + tests) or item #4 (Sparkline + density toggle). Tell me which and I'll open a focused PR.
