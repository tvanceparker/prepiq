# Copilot instructions for this repository

Purpose: equip AI coding agents to be productive immediately in this codebase by conveying the real architecture, workflows, and conventions used here.

## Questions

- Questions from the AI Model are important, I rather you ask questions on something I said rather then just do something random so please ask more questions and most prompts unless I am already explicitly clear
- If I am not clear, or if I'm just brainstorming and just typing stuff to you, give me some feedback and ideas or questions on how I want you to accoplish a task.

## Big picture

- Monorepo with FastAPI backend (`main.py` + `app/**`) and React frontend (`frontend/**`).
- Async MySQL via SQLAlchemy 2.0 and aiomysql. DB access is always scoped by `restaurant_id`.
- Auth is JWT-based; middleware extracts claims onto `request.state`. Services and routes use dependency-injected context.
- Background jobs use APScheduler to run EOD (End-of-Day) tasks.
- Realtime features via FastAPI WebSockets for kitchen/waiter rooms.

## How the backend is wired

- App bootstrap: `main.py`
  - Loads env (`dotenv.load_dotenv()`), configures logging handlers, CORS, and `AuthExtractionMiddleware`.
  - Includes all routers from `app/api/v1/*_routes.py` under the `/api/v1` prefix.
  - Registers WebSocket routers `app.sockets.kitchen_ws` and `app.sockets.waiter_ws`.
  - Schedules `app.utils.eod_runner.run_eod_jobs` every 60 minutes using `AsyncIOScheduler` in the FastAPI lifespan.
- Logging: central logger in `app/core/logging.py` with stream + rotating file (`logs/app.log`). Use decorators from `app/utils/logger_helpers.py`:
  - `@log_route()` on route handlers and `@log_method()` on service methods.

## Auth & permissions

- JWT config lives in `app/utils/security.py` (SECRET_KEY, ALGORITHM). Tokens include: `sub`, `restaurant_id`, `subscription_tier`, `employee_id`, `name`, `role_id`.
- Middleware: `app/core/middleware.AuthExtractionMiddleware` decodes Authorization Bearer token and sets `request.state.username`, `restaurant_id`, `subscription_tier`.
- Dependencies: `app/api/dependencies.py`
  - `get_current_user()` decodes JWT using `SECRET_KEY` and returns a `CurrentUser` object.
  - `check_permissions(["perm_a", ...])` verifies role permissions by joining `RolePermission` -> `Permission` with the current `role_id` and `restaurant_id`.
  - `build_service(ServiceClass)` provides `db`, `restaurant_id`, `subscription_tier`, `employee_id` to service constructors.

## Data access pattern

- Session: `app/db/session.py` creates an async engine (`mysql+aiomysql://...`) and `AsyncSessionLocal`; FastAPI dep `get_db()` yields, commits on success, rolls back on errors.
- Repositories: subclass `app/repositories/base_repository.BaseRepository`, always pass `restaurant_id` to scope queries. You can override `pk_field` (e.g., `ForecastRepository` uses `forecast_id`) and add richer queries.
- Models live under `app/db/models/*_orm.py` and include a `restaurant_id` column for multi-tenancy.

## Services and routes

- Services live in `app/services/*.py`. Routes depend on them via `get_*_service` from `app/api/dependencies.py`.
- Example: `app/api/v1/inventory_routes.py` injects `InventoryService`, uses Pydantic DTOs from `app/schemas/*`, and returns structured dicts or raises `HTTPException`.
- Prefer: route → dependency (`get_*_service`) → service → repositories. Keep tenant isolation via `restaurant_id` throughout.

## Realtime (WebSockets)

- Endpoints: `/ws/kitchen` and `/ws/waiter` require `?restaurant_id=` query param.
- Room naming convention in `app/sockets/connection_manager.py`: `kitchen_{restaurant_id}` and `waiter_{restaurant_id}`.
- Example: in `kitchen_ws`, receiving `{ "type": "order_ready", ... }` rebroadcasts to the waiter room for that restaurant.

## EOD scheduler

- `app/utils/eod_runner.py` reads all `Restaurant` rows, uses `timezone` and `hours_of_operation` (JSON) to decide when to run `EODService.finalize_end_of_day_summary(eod_date)` once per day per restaurant; persists `last_eod_run_date`.

## Running and testing

- Backend (FastAPI):
  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- Frontend (React via CRA):
  ```bash
  cd frontend
  npm start
  ```
- Tests (backend):
  ```bash
  pytest tests/
  ```
- E2E (Playwright):
  ```bash
  npx playwright test
  ```
- DB config via env: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` (see `app/db/session.py`). `.env` is loaded at startup.
- Seeding example: `scripts/seed_restaurant_2.py` generates `seed_restaurant_2.sql` with deterministic menu items and 60 days of sales for `restaurant_id=2`.

## Local environment notes

- OS: Arch Linux.
- Database: MariaDB (MySQL-compatible).
- Local DB credentials: username `root`, password `root`.

## Conventions to follow (when adding features)

- Create a repository subclass for your model, pass `restaurant_id`, and set `pk_field` if not `id`.
- Implement a service that accepts `(db, restaurant_id, subscription_tier, employee_id)`; expose it with `build_service` in `app/api/dependencies.py`.
- Add a router in `app/api/v1/*_routes.py`; annotate with `@log_route()` and inject your service via `Depends(get_*_service)`.
- Gate sensitive routes with `check_permissions(["permission_name"])` as needed.
- Use DTOs from `app/schemas/*` for request/response models to keep API contracts explicit.

## Mobile UI style (React Native)

- Prefer react-native-paper components for a cohesive, theme-aware UI (Card, List, Chip, Snackbar, Avatar, Button, TextInput).
- Ensure dark-mode adherence by using `theme.colors` and avoiding hard-coded colors; background should use `theme.colors.background`.
- Favor structured layouts:
  - Hero Card with title/subtitle and an action (e.g., Edit) in Card.Actions.
  - Section Cards (Contact, Business Hours) using `Card`, `List.Item`, and `Divider` for readability.
  - Chips for status/badges (e.g., subscription tier), not for mass state changes by default.
- Forms:
  - Use Formik for state and Yup for validation (e.g., HH:MM validation for time fields, required name/email).
  - Use react-native-paper `TextInput`, `Switch`, and `Button` for inputs; keep theming consistent.
- State/data:
  - Use @tanstack/react-query for queries/mutations; invalidate/re-fetch keys appropriately.
  - Types live in `mobile/src/interfaces/*` and should match backend DTOs.

## Pointers to key files

- App wiring: `main.py`
- Logger + decorators: `app/core/logging.py`, `app/utils/logger_helpers.py`
- Auth: `app/core/middleware.py`, `app/api/dependencies.py`, `app/services/auth_service.py`, `app/api/v1/auth_routes.py`, `app/utils/security.py`
- DB/session: `app/db/session.py`, models in `app/db/models/*_orm.py`
- Repos: `app/repositories/base_repository.py`, e.g., `app/repositories/forecast_repo.py`
- Realtime: `app/sockets/*.py`
- Scheduler: `app/utils/eod_runner.py`

If anything above is unclear or you need more examples (schemas, a full route+service+repo flow, or permission checks in practice), ask for a deeper dive and I’ll extend this document with concrete snippets from the codebase.
