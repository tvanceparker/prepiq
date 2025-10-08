# AGENTS.md

<!--
Copilot/AI Agent Manifest
This file provides system context for code generation, architectural reasoning,
and AI-assisted development across the PrepIQ repository.
Copilot should read this file before generating or modifying code.
-->

---

### Active AI Agent Roles

- **BackendAgent:** Expert in FastAPI, SQLAlchemy async, repository/service patterns and machine learning, data analytics.
- **FrontendAgent:** Specialist in React 18 + MUI/TanStack Query with strong TypeScript hygiene.
- **MobileAgent:** Focused on React Native parity and API alignment.
- **ForecastAgent:** Handles ML model maintenance, forecasting accuracy logic, and EOD analysis.
- **DocsAgent:** Keeps AGENTS.md, README, and endpoint docs synchronized with schema changes.
- **DatabaseAgent:** Expert in database design and management, with pydantic models, orms, and querying.

## 1. Repository Overview

```text
prepiq/
├── AGENTS.md                 # This orientation file for agents
├── README.md                 # Product-level overview & quickstart
├── main.py                   # FastAPI entrypoint
├── app/                      # Backend application modules
├── frontend/                 # React web client
├── mobile/                   # React Native mobile client
├── tests/                    # Automated backend test suites
├── scripts/                  # Tooling & seed scripts
├── requirements.txt          # Backend dependencies
├── package.json              # Repo-level tooling (if any)
└── .github/copilot-instructions.md  # Additional guidance for AI agents
```

### Core Technologies

- **Backend**: FastAPI (async), SQLAlchemy 2.0 async ORM, aiomysql, APScheduler, JWT auth.
- **Web Frontend**: React 18, React Router, MUI (Material UI), TanStack Query, Zustand, Chart.js/Recharts, Formik/Yup.
- **Mobile**: React Native with React Native Paper, React Navigation, shared REST API clients.
- **Testing**: Pytest for backend, React Testing Library & Jest for web, Playwright/Cypress for E2E, (future) mobile unit tests.

---

## 2. Backend Architecture (`app/`)

### 2.1 Application Bootstrap

- **Entry**: `main.py` initializes the FastAPI app, loads environment variables (`dotenv.load_dotenv()`), configures logging, CORS, and installs the `AuthExtractionMiddleware`.
- **Routers**: All REST endpoints live under `app/api/v1/*_routes.py` and are included with prefix `/api/v1`.
- **WebSockets**: `app.sockets.kitchen_ws` and `app.sockets.waiter_ws` are registered for realtime kitchen/waiter rooms.
- **Scheduler**: During the FastAPI lifespan, an `AsyncIOScheduler` schedules `app.utils.eod_runner.run_eod_jobs` every 60 minutes to evaluate End-of-Day tasks.

### 2.2 Request Flow & Auth

- Incoming requests pass through `app/core/middleware.AuthExtractionMiddleware`, which decodes the Bearer JWT, extracts tenant (`restaurant_id`), role, user details, and populates `request.state`.
- Route dependencies defined in `app/api/dependencies.py`:
  - `get_current_user()` returns a `CurrentUser` Pydantic model from the JWT.
  - `check_permissions([...])` ensures the current role has necessary permissions by joining `RolePermission`/`Permission` tables.
  - `build_service(ServiceClass)` resolves services with dependencies: async DB session, `restaurant_id`, `subscription_tier`, `employee_id`.

### 2.3 Data Layer & Repositories

- **Session**: `app/db/session.py` configures an async SQLAlchemy engine (`mysql+aiomysql://`) and exposes `AsyncSessionLocal`. The `get_db` dependency manages commit/rollback and session closing.
- **Models**: Under `app/db/models`, each ORM class includes a `restaurant_id` column to enforce multi-tenancy.
- **ORM Modules**: Tables are defined in `app/db/models/*_orm.py`. File names follow the domain plus `_orm` suffix (for example, `inventory_orm.py`) to keep persistence classes distinct from DTOs and services.
- **Repositories**: Classes extend `app/repositories/base_repository.BaseRepository`. Each repository is instantiated with `(db, restaurant_id)` to scope queries. Override `pk_field` for non-standard primary keys.
- **Services**: Reside in `app/services/`, encapsulating business logic. They are constructed via dependency injection (`build_service`) and call repositories. Decorators in `app/utils/logger_helpers.py` (`@log_route`, `@log_method`) add structured logging.

### 2.4 APIs & Schemas

- **Routes**: Each module in `app/api/v1/` focuses on a domain (inventory, sales, auth, etc.) and wires to services via FastAPI dependency injection. File names match the service domain (e.g., `inventory_routes.py` pairs with `inventory_service.py`).
- **DTO Modules**: Pydantic models live in `app/schemas/<domain>_dto.py`. Keep the DTO module name aligned to the service (`inventory_service` ↔ `inventory_dto`), and export request/response classes that mirror the service methods (for example, `InventoryRequest`, `InventoryResponse`).
- **Validation & Errors**: Services raise `HTTPException` for user-facing errors; repositories raise domain exceptions where appropriate.

### 2.5 Background Processing & Realtime

- **End-of-Day Runner**: `app/utils/eod_runner.py` walks active restaurants, evaluates time zone & operating hours, and ensures `EODService.finalize_end_of_day_summary()` runs exactly once per restaurant per day. Keeps `last_eod_run_date` in sync.
- **Realtime**: `app/sockets/connection_manager.py` manages connections. Kitchen/waiter rooms follow `kitchen_{restaurant_id}`/`waiter_{restaurant_id}` naming. WebSocket handlers rebroadcast messages (e.g., kitchen notifications to waiters).

### 2.6 Logging & Monitoring

- Central logger defined in `app/core/logging.py` writes to console and rotating file `logs/app.log`.
- Use `@log_route()` on API handlers and `@log_method()` on service methods for consistent telemetry. Favor `logger.info`/`logger.warning` with structured context.

### 2.7 Integrations & Utilities

- External integrations (e.g., weather) live under `app/integrations/`.
- Shared utilities (security helpers, conversions, metrics) live in `app/utils/`.
- Machine learning/forecast logic is inside `app/services/forecasting_engine.py` and related repositories/services. `ForecastingEngine` tracks accuracy, writes predictions, and provides ingredient breakdowns to reorder systems.

### 2.8 Testing & Scripts

- **Tests**: `tests/` folder mirrors service/repository layers (e.g., `tests/forecasting_engine/`). Run via `pytest` (see `pytest.ini`).
- **Scripts**: `scripts/` contains helpers like database seeders (`seed_restaurant_2.py`).
- **Coverage**: HTML reports stored in `/htmlcov/` after running coverage-enabled pytest commands.

---

## 3. Web Frontend (`frontend/`)

### 3.1 Stack & Tooling

- React 18 with functional components and hooks.
- Routing via `react-router-dom` (`frontend/src/routes/AppRoutes.{tsx,jsx}`).
- State/data fetching: TanStack Query for API caching; Zustand for localized global state; React Context for auth/device state.
- UI: Primarily MUI (Material UI) components, with some legacy Tailwind utility classes slated for removal. Custom components live in `frontend/src/components/`.
- Theming: Defined in `frontend/src/theme.ts` with light/dark palettes and typography settings. Theme toggled through context and localStorage.
- Build/test scripts: `npm start`, `npm run build`, `npm test`. E2E via Playwright (`npx playwright test`).

### 3.2 Application Shell

- `App.tsx` decides between auth routes and the authenticated shell (`Layout`).
- **Layout**: `frontend/src/components/Layout.jsx` (pending TS migration) manages header, persistent sidebar, alerts badge, and theme toggles. The sidebar uses tier-aware navigation data (`components/data/sidebarData.js`).
- **Contexts**:
  - `AuthContext` handles user session, tier, permissions, logout.
  - `DeviceContext` manages POS device registration state.
  - `RegistrationModalContext` coordinates modals for device registration.
- **Global UI Utilities**: `GlobalSnackbar`, `HintBox`, `CardShell`, etc., standardize messaging and card layout.

### 3.3 Feature Modules & Tiering

- Pages under `frontend/src/pages/` mirror backend domains (dashboard, inventory, sales, prep, admin, settings, team, analytics).
- Many dashboards (e.g., `DailyOverview.tsx`) render tier-specific components (`BasicOverview`, `ProOverview`, `MasterOverview`).
- Sidebar configuration separates Basic vs Master features, enabling quick gating based on subscription.

### 3.4 Data Access Layer

- REST clients live in `frontend/src/api/`, with an Axios instance adding JWT Authorization headers.
- Feature-specific API wrappers (e.g., `dashboard.ts`, `inventory.js`) encapsulate endpoint calls.
- Hooks (e.g., `pages/dashboard/hooks`) compose TanStack Query calls and handle caching/invalidation.
- Interfaces are in the `frontend/interface/` and that's where we get the types and things, they should have the same name as the module that uses them. 

### 3.5 Forms & Components

- Forms typically use Formik + Yup for validation (`forms/` helpers).
- Custom components wrap MUI primitives for buttons, modals, tables, tags, etc. Migration goal: convert all `.jsx` components to TypeScript `.tsx` and remove Tailwind classnames.
- Charts: `react-chartjs-2`, Recharts, and custom visualizations housed in `pages/sales/charts/`.

### 3.6 Testing & Quality

- Unit tests with React Testing Library (`App.test.js`, `setupTests.js`).
- E2E/regression tests planned via Playwright (dev dependency already installed).
- Upcoming work: spin up Storybook for design-system primitives and enforce lint rules preventing Tailwind usage.

---

## 4. Mobile App (`mobile/`)

### 4.1 Stack

- React Native (Expo-style structure) with TypeScript.
- UI built with React Native Paper to parallel MUI design tokens.
- Navigation defined in `mobile/src/navigation/` (React Navigation stack/tab config).
- API clients in `mobile/src/api/` mirror the web Axios wrappers.

### 4.2 Structure

```text
mobile/src/
├── App.tsx                    # Entry point registering providers & navigation
├── theme.ts                  # Light/dark themes aligned with web palette
├── components/               # RN variants of shared UI primitives (CardShell, Layout, etc.)
├── contexts/                 # Auth, Theme, UI contexts
├── navigation/               # Root navigator & route definitions
├── pages/                    # Screen implementations mirroring web routes by domain
├── state/                    # App-level context providers
└── utils/                    # Helpers (formatting, etc.)
```

- Screens are organized by domain (`dashboard`, `sales`, `admin`, etc.), with basic-tier subcomponents under `pages/*/components/`.
- `sidebarData.ts` defines navigation/tier structure analogous to the web sidebar.
- Planned work: ensure shared design tokens and tier accents stay in sync with the web design system refresh.

### 4.3 Testing & Build

- (Planned) Unit tests to be added using Jest/React Native Testing Library.
- The project targets parity with the web in functionality, with adaptations for mobile UX (e.g., drawer navigation, touch-first components).

---

## 5. Shared Services & Workflows

### 5.1 API Contract

- REST endpoints under `/api/v1/` power both web and mobile clients. Ensure changes to schemas are reflected in both `frontend/src/interfaces/` and `mobile/src/interfaces/`.
- Authentication tokens stored in browser `localStorage` (web) and secure storage (future mobile update). Middleware expects Bearer JWT on every request.

### 5.2 Multi-Tenancy

- `restaurant_id` is mandatory for all queries. Repositories/services should never return or mutate data outside the current tenant.
- Background jobs (EOD) iterate per restaurant; watch for time zone and hours-of-operation edge cases.

### 5.3 Logging & Telemetry

- Favor the shared logging decorators on backend routes/services.
- Frontend should funnel critical alerts through `GlobalSnackbar` and the Alerts Feed.
- EOD and forecasting services emit telemetry in stdout/log files—useful when debugging scheduling or forecast accuracy.

### 5.4 Testing Strategy

- Backend: Pytest suite with fixtures for database interactions; run `pytest tests/` before backend PRs.
- Frontend: Run `npm test` for unit tests and start adding Playwright coverage for key flows (login, dashboard, inventory).
- Mobile: Manual QA for now; unit/E2E tests to be added as features stabilize.

---

## 6. Development Workflow

1. **Environment Setup**

   - Backend: `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`.
   - Web: `cd frontend && npm install`.
   - Mobile: Install dependencies via `npm install` or `yarn` inside `mobile/` (Expo or React Native CLI tooling as configured).

2. **Running Services**

   - Backend: `uvicorn main:app --reload --host 0.0.0.0 --port 8000` (task available in VS Code).
   - Web frontend: `cd frontend && npm start` (CRA dev server on port 3000).
   - Mobile: `cd mobile && npm start` (Expo) or `npx react-native run-...` depending on platform.

3. **Database**

   - Configure `.env` with MySQL credentials. For local dev, seed using scripts in `scripts/`.
   - Ensure migrations (if added later) keep tenant isolation intact.

4. **Coding Standards**

   - Backend: Use async SQLAlchemy sessions, respect repository/service boundaries, and include `restaurant_id` everywhere.
   - Frontend: Migrate components to TypeScript, replace Tailwind classes with MUI/theming primitives, and leverage TanStack Query for async data.
   - Mobile: Maintain parity with web features, use shared token palette, and keep types aligned with backend schemas.

5. **Branching & Testing**
   - Create feature branches, run relevant test suites (pytest / `npm test`), and lint before opening PRs.
   - For major UI refactors, attach screenshots or structured Storybook references.

---

---

## 8. Quick Reference

| Area               | Location                                      | Notes                                                            |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| FastAPI entry      | `main.py`                                     | Registers middleware, routers, scheduler                         |
| Auth middleware    | `app/core/middleware.py`                      | Extracts JWT, populates `request.state`                          |
| Services & repos   | `app/services/`, `app/repositories/`          | Always inject via `build_service`; enforce `restaurant_id` scope |
| Forecasting engine | `app/services/forecasting_engine.py`          | Weather-aware ML forecasts, accuracy tracking                    |
| EOD automation     | `app/utils/eod_runner.py`                     | Runs hourly via APScheduler                                      |
| Web layout         | `frontend/src/components/Layout.jsx`          | Header/sidebar shell (planned TS refactor)                       |
| Tier navigation    | `frontend/src/components/data/sidebarData.js` | Defines routes for Basic vs Master                               |
| Web API client     | `frontend/src/api/index.ts`                   | Axios instance with auth interceptor                             |
| Mobile entry       | `mobile/src/App.tsx`                          | Configures providers, navigation                                 |
| Mobile theme       | `mobile/src/theme.ts`                         | Light/dark palettes aligned with web                             |

---

_Keep this file updated as architecture evolves (notably the ongoing UI refactor and mobile parity work). When significant changes land (new services, design system rollout, etc.), append a changelog section so agents can adapt quickly._
