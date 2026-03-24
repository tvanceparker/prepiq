# Copilot instructions for this repository

Purpose: give AI coding agents the minimum architecture context and the concrete implementation rules needed to make consistent changes in this codebase.

Use this file as a rules document first. It should help answer questions like:

- where DTOs go
- how services are wired
- how repositories enforce tenant isolation
- where frontend and mobile types live
- what patterns are the default for new work

Do not treat this file as a product README or roadmap. If older or legacy surfaces still exist in the repo, do not use them as the default pattern for new v1 work unless the task explicitly touches them.

## Working style

- Ask questions when the user is brainstorming, unclear, or when there are multiple plausible implementation paths.
- If the task is clear, implement directly instead of staying in planning mode.
- Prefer consistency with the existing module pattern over inventing a new structure for one feature.

## Core architecture guardrails

- This is a monorepo with a FastAPI backend in `app/`, a React web client in `frontend/`, and a React Native mobile client in `mobile/`.
- Backend request flow should generally remain: route -> dependency -> service -> repository.
- Database access is tenant-scoped. `restaurant_id` is a required part of the backend data model and must remain enforced in all tenant-bound repository queries.
- Auth is JWT-based. Middleware and dependencies extract user context that services use for tenant-aware behavior.
- End-of-day orchestration is a real backend pattern in this repo. If a feature affects forecast, reorder, purchasing, or daily finalization behavior, review the EOD path before making changes.
- Use architecture notes only to guide implementation choices. Avoid adding product-marketing language to this file.

## Backend conventions

### Repositories

- New tenant-bound repositories should subclass `app/repositories/base_repository.BaseRepository`.
- Repository constructors should receive `db` and `restaurant_id`, and set `pk_field` when the primary key is not `id`.
- Do not bypass tenant scoping for normal application queries. If a task truly needs cross-tenant behavior, make that explicit and isolate it carefully.
- Keep repository responsibilities focused on persistence, query composition, and model retrieval. Do not move business rules into repositories.

### Services

- Services belong in `app/services/`.
- For tenant-aware services, use the constructor shape already used in the repo:

  ```python
  def __init__(self, db, restaurant_id, subscription_tier, employee_id):
      ...
  ```

- Expose services through `build_service(...)` in `app/api/dependencies.py`.
- Keep business logic in services, not in routes.
- If a service needs repository helpers, compose repositories inside the service rather than letting routes talk to repositories directly.
- Use `@log_method()` on service methods when following the existing logging pattern for that module.

### Routes and dependencies

- Routes live under `app/api/v1/*_routes.py`.
- Inject services via `Depends(get_*_service)` from `app/api/dependencies.py`.
- Use DTOs from `app/schemas/*_dto.py` for request and response contracts.
- Raise `HTTPException` for user-facing failures at the route or service boundary.
- Use `check_permissions(...)` only when the task explicitly involves legacy permission-gated code. Do not assume new v1 work should default to granular role expansion unless the user asks for it.
- Keep route handlers thin. Validation, orchestration, and cross-repository logic should stay in services.

### DTOs and schemas

- Pydantic DTO modules live in `app/schemas/<domain>_dto.py`.
- Align DTO module names with the domain or service they support, for example `inventory_dto.py` for inventory-related contracts.
- Prefer explicit request and response models over loose dict payloads.
- When adding or changing backend contracts, update the corresponding frontend and mobile types in the same task unless the user explicitly scopes otherwise.

### Models and ORM files

- ORM models live under `app/db/models/*_orm.py`.
- Keep ORM class naming and file naming aligned to the domain.
- Tenant-bound tables should include `restaurant_id` unless there is a strong architectural reason not to.

### Logging, auth, and scheduling

- Shared logging lives in `app/core/logging.py` with decorators in `app/utils/logger_helpers.py`.
- JWT extraction and service injection patterns live in `app/api/dependencies.py` and `app/core/middleware.py`.
- If a change interacts with scheduled daily processing, inspect `app/utils/eod_runner.py` and `app/services/eod_service.py` before changing behavior.

## Frontend conventions

### Stack and structure

- The web app is React-based and lives under `frontend/`.
- Prefer existing app patterns: TanStack Query for server data, local UI state in components, and shared interfaces under `frontend/src/interfaces/`.
- Preserve the existing app shell, route, and page organization unless the task is explicitly about restructuring.

### Hooks organization

- For pages with meaningful data fetching or mutation logic, create a colocated hooks file in a `hooks/` folder near the page.
- Preferred hook naming is `use<PageName>.ts`.
- Hooks should own:
  - query and mutation calls
  - invalidation logic
  - computed state
  - user action handlers
  - snackbar or notification state tied to the page workflow
- Page components should focus on rendering and small local UI state.

### Types and interfaces

- Web interfaces live in `frontend/src/interfaces/`.
- Keep interface names aligned to the domain or feature using them.
- When backend DTOs change, update the relevant web interfaces in the same task when feasible.
- Do not introduce one-off inline response shapes in components when a shared interface already exists or should exist.

### UI implementation

- Prefer MUI-based patterns and the current design system direction over introducing new UI libraries.
- Some legacy Tailwind utility usage still exists. Do not expand that footprint unless the task is specifically within a legacy component that already relies on it.
- When creating new pages with non-trivial logic, keep data concerns in hooks and presentation in the page component.

## Mobile conventions

- The mobile app lives in `mobile/` and uses React Native with React Native Paper.
- Prefer React Native Paper components for new UI work unless the screen already follows a different established pattern.
- Respect theme-driven styling and avoid hard-coded colors when a theme token exists.
- Mobile interfaces live in `mobile/src/interfaces/`.
- When backend DTOs change, update mobile interfaces alongside web interfaces when the affected contract is shared.
- Keep mobile screens aligned to the same API contracts and feature boundaries used by the web app.

## Cross-platform consistency rules

- Backend DTOs, web interfaces, and mobile interfaces should describe the same contract for shared features.
- If a backend endpoint changes shape, review all three layers:
  - `app/schemas/`
  - `frontend/src/interfaces/`
  - `mobile/src/interfaces/`
- Do not leave one client on an outdated contract unless the task explicitly requires staged rollout behavior.
- Keep naming as parallel as practical across backend DTOs and client interfaces.

## Legacy and special-case areas

- This repo still contains older or broader surfaces than the intended v1 product direction.
- Internal POS, kitchen realtime flows, device-specific operations, and granular permissions may still appear in the codebase. Treat them as task-specific or legacy areas unless the user explicitly asks you to extend or repair them.
- When touching older areas, preserve existing behavior and structure unless the task is explicitly a cleanup or refactor.
- Do not copy a legacy pattern into new work just because it exists somewhere in the repo.

## Running and testing

- Backend:

  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

- Web:

  ```bash
  cd frontend
  npm start
  ```

- Mobile:

  ```bash
  cd mobile
  npm start -- --clear
  ```

- Backend tests:

  ```bash
  pytest tests/
  ```

- End-to-end tests:

  ```bash
  npx playwright test
  ```

## Key file pointers

- App bootstrap: `main.py`
- Dependencies and service injection: `app/api/dependencies.py`
- Middleware and auth extraction: `app/core/middleware.py`
- DB session: `app/db/session.py`
- Base repository: `app/repositories/base_repository.py`
- DTOs: `app/schemas/*_dto.py`
- Services: `app/services/`
- EOD orchestration: `app/services/eod_service.py`, `app/utils/eod_runner.py`
- Web interfaces: `frontend/src/interfaces/`
- Mobile interfaces: `mobile/src/interfaces/`

If a prompt is unclear, ask for direction. If a prompt is concrete, follow these rules and implement the change with the existing patterns instead of inventing a new local convention.
