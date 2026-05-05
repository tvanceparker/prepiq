# AGENTS.md

<!--
Copilot/AI Agent Manifest
This file provides system context for code generation, architectural reasoning,
and AI-assisted development across the PrepIQ repository.
Copilot should read this file before generating or modifying code.
-->

---

## Active AI Agent Roles

These roles are conceptual guidance profiles for reasoning and implementation decisions in this repository. They are not automatically registered as callable runtime subagents unless the surrounding agent tooling explicitly supports and configures them.

- **BackendAgent:** Expert in FastAPI, SQLAlchemy async, repository/service patterns, and backend orchestration.
- **FrontendAgent:** Specialist in React 18, TanStack Query, TypeScript hygiene, and frontend architecture cleanup.
- **MobileAgent:** Focused on React Native parity, navigation, and API-aligned mobile UX.
- **ForecastAgent:** Handles forecasting logic, forecast accuracy, and EOD analysis.
- **DocsAgent:** Keeps AGENTS.md, README, and implementation-facing docs synchronized with schema and architecture changes.
- **DatabaseAgent:** Expert in database design, tenant scoping, ORM patterns, and query structure.
- **OperationsAgent:** Expert in SMB restaurant operations, workflows, ordering and purchasing practices, inventory replenishment, and practical day-to-day operator constraints.

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
- **Web Frontend**: React 18, React Router, TanStack Query, Zustand, MUI-heavy legacy UI, Formik/Yup, charting libraries.
- **Mobile**: React Native with React Native Paper, React Navigation, shared REST API clients.
- **Testing**: Pytest for backend, React Testing Library/Jest for web, Playwright for E2E, mobile tests still limited.

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
- **Realtime**: `app/sockets/connection_manager.py` manages connections. Kitchen/waiter rooms follow `kitchen_{restaurant_id}`/`waiter_{restaurant_id}` naming. These realtime/internal-ops surfaces still exist in the repo, but they should not be treated as the default pattern for new v1 product work unless the task explicitly targets them.

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
- State/data fetching: TanStack Query for API caching; Zustand for localized global state; React Context for auth and device state.
- UI: The current app is largely MUI-based, with some legacy Tailwind utility usage still present. Treat that as current implementation reality, not a permanent design-system decision.
- Theming: Defined in `frontend/src/theme.ts` and related theme files.
- Build/test scripts: `npm start`, `npm run build`, `npm test`. E2E via Playwright (`npx playwright test`).

### 3.2 Application Shell

- `App.tsx` decides between auth routes and the authenticated shell (`Layout`).
- **Layout**: `frontend/src/components/Layout.jsx` manages the main shell, header, sidebar, alerts badge, and theme toggles. This remains a central cleanup target for frontend modernization.
- **Contexts**:
  - `AuthContext` handles user session and logout flow.
  - `DeviceContext` and related registration contexts still exist for legacy or special-case device flows.
- **Global UI Utilities**: shared components such as snackbars, cards, and layout wrappers live under `frontend/src/components/`.

### 3.3 Feature Modules & Tiering

- Pages under `frontend/src/pages/` generally mirror backend domains.
- Some routing, sidebar, and tier scaffolding still reflect older `basic/pro/master` and internal-ops assumptions. Treat those as cleanup targets rather than the desired long-term product shape.
- Runtime tier handling should normalize legacy `pro` and `master` values to `full`. For new work, reason in terms of `basic` and `full` unless the task explicitly concerns legacy compatibility or data migration.

### 3.4 Data Access Layer

- REST clients live in `frontend/src/api/`, with an Axios instance adding JWT authorization headers.
- Feature-specific API wrappers encapsulate endpoint calls.
- Hooks compose TanStack Query calls and handle caching/invalidation.
- Shared interfaces live in `frontend/src/interfaces/` and should stay aligned with backend DTOs.

### 3.5 Hooks Organization (IMPORTANT)

- **Every page with complex data fetching or state management should have a dedicated hooks file** in a `hooks/` folder colocated with the page.
- Hooks file naming: `use<PageName>.ts` (e.g., `useIntegrationSettings.ts`, `useAccountSettings.ts`, `useDashboard.ts`).
- The hook should encapsulate:
  - All `useQuery` and `useMutation` calls (TanStack Query)
  - Snackbar/notification state
  - Handler functions for user actions
  - Computed/derived state
- The page component should only handle:
  - Local UI state (dialogs open/closed, form inputs)
  - JSX rendering
  - Importing and using the hook
- This keeps page components clean and focused on presentation while hooks handle data logic.
- Example structure:

  ```text
  pages/settings/
  ├── IntegrationSettings.tsx    # UI component (~400 lines)
  ├── hooks/
  │   └── useIntegrationSettings.ts  # Data/logic hook (~250 lines)
  ```

### 3.6 Forms & Components

- Forms typically use Formik + Yup for validation.
- Custom components currently wrap a mix of MUI primitives and legacy utility styling.
- Frontend cleanup may replace or reduce MUI usage. Until a new design system is selected, preserve consistency within the area you are touching instead of mixing multiple new styling systems ad hoc.
- Charts live in feature-specific pages and chart folders.

### 3.7 Testing & Quality

- Unit tests use React Testing Library.
- E2E/regression tests use Playwright.
- Frontend modernization and design-system cleanup are active architecture concerns, so major UI work should keep reuse, page-shell consistency, and component extraction in mind.

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
- `sidebarData.ts` defines navigation and tier structure analogous to the web sidebar.
- Mobile should stay aligned to the same API contracts and overall product direction as the web app, but should not mechanically copy web UI patterns that do not fit mobile interaction.

### 4.3 Testing & Build

- Mobile automated testing is still lighter than the web/backend side.
- The project targets parity with the web in functionality, with adaptations for mobile UX.

---

## 5. Shared Services & Workflows

### 5.1 API Contract

- REST endpoints under `/api/v1/` power both web and mobile clients.
- Changes to backend schemas should be reflected in both `frontend/src/interfaces/` and `mobile/src/interfaces/` unless the task explicitly requires a staged rollout.
- Authentication tokens are stored in browser `localStorage` on web today; mobile storage handling may evolve separately.

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
- Frontend: Keep data logic in hooks, shared contracts in `frontend/src/interfaces/`, and avoid adding new UI inconsistency while design-system cleanup is in progress.
- Mobile: Maintain parity with web features where appropriate, respect mobile interaction patterns, and keep types aligned with backend schemas.

1. **Branching & Testing**
   - Create feature branches, run relevant test suites (pytest / `npm test`), and lint before opening PRs.
   - For major UI refactors, attach screenshots or structured Storybook references.

---

---

## 8. Quick Reference

| Area               | Location                                      | Notes                                                             |
| :----------------- | :-------------------------------------------- | :---------------------------------------------------------------- |
| FastAPI entry      | `main.py`                                     | Registers middleware, routers, scheduler                          |
| Auth middleware    | `app/core/middleware.py`                      | Extracts JWT, populates `request.state`                           |
| Services & repos   | `app/services/`, `app/repositories/`          | Always inject via `build_service`; enforce `restaurant_id` scope  |
| Forecasting engine | `app/services/forecasting_engine.py`          | Weather-aware ML forecasts, accuracy tracking                     |
| EOD automation     | `app/utils/eod_runner.py`                     | Runs hourly via APScheduler                                       |
| Web layout         | `frontend/src/components/Layout.jsx`          | Header/sidebar shell (planned TS refactor)                        |
| Tier navigation    | `frontend/src/components/data/sidebarData.js` | Still contains older tier and surface assumptions; cleanup target |
| Web API client     | `frontend/src/api/index.ts`                   | Axios instance with auth interceptor                              |
| Mobile entry       | `mobile/src/App.tsx`                          | Configures providers, navigation                                  |
| Mobile theme       | `mobile/src/theme.ts`                         | Light/dark palettes aligned with web                              |

---

_Keep this file updated as architecture evolves. Use `.github/copilot-instructions.md` as the sharper implementation-rules document; use this file for broader repo context that should not conflict with those rules._
