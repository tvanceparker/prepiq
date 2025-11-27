# CLAUDE.md - PrepIQ Development Guidelines

This file provides context and guidelines for AI-assisted development on PrepIQ, a restaurant management system with intelligent forecasting, inventory management, and team coordination.

## Project Overview

PrepIQ is a comprehensive restaurant SaaS platform built with:
- **Backend**: FastAPI (async), SQLAlchemy 2.0 (async), MySQL, APScheduler
- **Web**: React 18, MUI, TanStack Query, Zustand
- **Mobile**: React Native with React Native Paper (in development)
- **Auth**: JWT with role-based permissions
- **Realtime**: FastAPI WebSockets for kitchen/waiter coordination

## Core Principles

### Ask Questions First
- If requirements are unclear or if I'm brainstorming ideas, ask clarifying questions
- Confirm architectural approaches before implementation
- Verify assumptions about existing patterns
- Request feedback on proposed solutions

### Multi-Tenancy is Sacred
- Every query MUST be scoped by `restaurant_id`
- All ORM models include `restaurant_id` column
- Repositories are always instantiated with `(db, restaurant_id)`
- Services receive `restaurant_id` via dependency injection
- **Never** return or mutate data outside the current tenant

### Repository Structure
```
prepiq/
├── main.py                   # FastAPI entry point
├── app/
│   ├── api/v1/              # REST endpoints (*_routes.py)
│   ├── core/                # Middleware, logging, config
│   ├── db/
│   │   ├── models/          # ORM classes (*_orm.py)
│   │   └── session.py       # Async DB session
│   ├── repositories/        # Data access layer
│   ├── schemas/             # Pydantic DTOs (*_dto.py)
│   ├── services/            # Business logic
│   ├── sockets/             # WebSocket handlers
│   ├── integrations/        # External APIs (POS, weather, etc.)
│   └── utils/               # Helpers, security, logging
├── frontend/                # React web app
├── mobile/                  # React Native app
├── tests/                   # Pytest suites
├── scripts/                 # DB migrations, seeders
└── docs/                    # Technical documentation

```

## Backend Development

### Request Flow
1. Request → `AuthExtractionMiddleware` decodes JWT → populates `request.state`
2. Route handler → depends on `get_current_user()` and `check_permissions([...])`
3. Service injected via `build_service(ServiceClass)` with `(db, restaurant_id, subscription_tier, employee_id)`
4. Service calls repositories → repository queries scoped by `restaurant_id`
5. Return Pydantic DTO or raise `HTTPException`

### File Naming Conventions
- **ORM models**: `app/db/models/<domain>_orm.py` (e.g., `inventory_orm.py`)
- **Repositories**: `app/repositories/<domain>_repo.py` (extends `BaseRepository`)
- **Services**: `app/services/<domain>_service.py`
- **Routes**: `app/api/v1/<domain>_routes.py`
- **DTOs**: `app/schemas/<domain>_dto.py`

Keep naming aligned: `inventory_service.py` ↔ `inventory_routes.py` ↔ `inventory_dto.py`

### Repository Pattern
```python
from app.repositories.base_repository import BaseRepository

class ForecastRepository(BaseRepository):
    pk_field = "forecast_id"  # Override if not "id"

    def __init__(self, db: AsyncSession, restaurant_id: int):
        super().__init__(db, restaurant_id, ForecastORM)
```

### Service Pattern
```python
from app.utils.logger_helpers import log_method

class InventoryService:
    def __init__(self, db: AsyncSession, restaurant_id: int,
                 subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.tier = subscription_tier
        self.repo = InventoryRepository(db, restaurant_id)

    @log_method()
    async def get_items(self) -> list[InventoryItemDTO]:
        items = await self.repo.get_all()
        return [InventoryItemDTO.from_orm(item) for item in items]
```

### Route Pattern
```python
from app.api.dependencies import get_current_user, build_service, check_permissions
from app.utils.logger_helpers import log_route

@router.get("/items")
@log_route()
async def get_items(
    current_user: CurrentUser = Depends(get_current_user),
    service: InventoryService = Depends(build_service(InventoryService)),
    _: None = Depends(check_permissions(["view_inventory"]))
):
    return await service.get_items()
```

### Logging
- Use decorators: `@log_route()` on routes, `@log_method()` on service methods
- Logger: `app/core/logging.py` (console + rotating file `logs/app.log`)
- Include structured context: `logger.info("msg", extra={"key": "value"})`

### Authentication & Permissions
- JWT config in `app/utils/security.py`
- Token includes: `sub`, `restaurant_id`, `subscription_tier`, `employee_id`, `role_id`
- Middleware: `app/core/middleware.AuthExtractionMiddleware`
- Check permissions: `check_permissions(["permission_name"])` dependency

### Background Jobs
- **EOD Runner**: `app/utils/eod_runner.py` runs hourly via APScheduler
- Evaluates each restaurant's timezone/hours, runs `EODService.finalize_end_of_day_summary()` once per day
- Tracks `last_eod_run_date` to prevent duplicate runs

### WebSockets
- Endpoints: `/ws/kitchen?restaurant_id=X`, `/ws/waiter?restaurant_id=X`
- Room naming: `kitchen_{restaurant_id}`, `waiter_{restaurant_id}`
- Connection manager: `app/sockets/connection_manager.py`

## Frontend Development

### Tech Stack
- React 18 with functional components/hooks
- Routing: `react-router-dom` (v7)
- State: TanStack Query (server state) + Zustand (local state)
- UI: **MUI (Material UI)** - primary component library
- Forms: Formik + Yup validation
- Charts: Recharts, Chart.js, D3, Nivo

### Tailwind Migration
**IMPORTANT**: We are actively removing Tailwind CSS. Do NOT add new Tailwind classes.
- Use MUI components and `sx` prop for styling
- Reference `frontend/src/theme.ts` for theme tokens
- Convert existing `.jsx` components to TypeScript `.tsx`

### File Organization
- Pages: `frontend/src/pages/<domain>/` (e.g., `pages/dashboard/`, `pages/inventory/`)
- Components: `frontend/src/components/` (reusable UI primitives)
- API clients: `frontend/src/api/` (Axios wrappers per domain)
- Interfaces: `frontend/src/interfaces/` (TypeScript types matching backend DTOs)
- Hooks: `frontend/src/pages/<domain>/hooks/` (TanStack Query wrappers)

### Subscription Tiering
- Many dashboards render tier-specific components (`BasicOverview`, `ProOverview`, `MasterOverview`)
- Sidebar navigation defined in `components/data/sidebarData.js` with tier-based feature gating
- Check `AuthContext` for current user's `subscription_tier`

### API Integration
- Base Axios instance in `frontend/src/api/index.ts` adds JWT `Authorization` header
- Feature-specific wrappers (e.g., `api/dashboard.ts`, `api/inventory.js`)
- Use TanStack Query hooks for caching/invalidation

### Contexts
- `AuthContext`: User session, tier, permissions, logout
- `DeviceContext`: POS device registration state
- `RegistrationModalContext`: Device registration modals
- Theme context for light/dark mode (persisted in localStorage)

## Mobile Development (React Native)

### Tech Stack
- React Native with TypeScript
- UI: **React Native Paper** (aligns with MUI design system)
- Navigation: React Navigation (stack/tab navigators)
- API clients mirror web implementation

### Styling Guidelines
- **Use React Native Paper components**: Card, List, Chip, Button, TextInput, etc.
- **Theme-aware styling**: Use `theme.colors` - never hardcode colors
- **Dark mode support**: Background should use `theme.colors.background`
- **Structured layouts**:
  - Hero Card with title/subtitle and Card.Actions for CTAs
  - Section Cards with List.Item and Divider
  - Chips for status badges (tier, alerts)

### Forms
- Use Formik for state management
- Yup for validation (e.g., HH:MM time format, required fields)
- React Native Paper inputs for consistent theming

### State Management
- TanStack Query for API calls (same pattern as web)
- Types in `mobile/src/interfaces/` match backend DTOs

## Testing

### Backend
```bash
pytest tests/                    # Run all tests
pytest tests/forecasting/        # Run specific module
pytest --cov=app --cov-report=html  # Coverage report
```

### Frontend
```bash
cd frontend
npm test                         # Jest + React Testing Library
npx playwright test              # E2E tests
```

### Mobile
- (Planned) Jest + React Native Testing Library
- Manual QA for now

## Database

### Session Management
- Async engine: `mysql+aiomysql://...` in `app/db/session.py`
- Dependency: `get_db()` yields session, commits on success, rolls back on error

### Migrations
- SQL scripts in `scripts/migrations/`
- Always include `restaurant_id` column in new tables
- Test with multiple tenants to ensure isolation

## Integrations

### POS Systems (Square, Toast, Clover)
- Base provider interface: `app/integrations/pos/base_provider.py`
- OAuth flow + webhook verification
- Token encryption via Fernet (`app/integrations/pos/encryption_utils.py`)
- Routes: `/api/v1/settings/pos/*` and `/api/v1/webhooks/pos/*`
- Service: `app/services/pos_integration_service.py`

### Weather Integration
- Used by `ForecastingEngine` for demand prediction
- External API wrappers in `app/integrations/`

## Coding Standards

### Python (Backend)
- Async/await throughout (SQLAlchemy async sessions)
- Type hints on all function signatures
- Respect repository/service boundaries
- Include `restaurant_id` in all queries
- Use `@log_route()` and `@log_method()` decorators

### TypeScript (Frontend/Mobile)
- Strict typing enabled
- Interfaces in dedicated files (`frontend/src/interfaces/`)
- Functional components with hooks (no class components)
- Prefer composition over prop drilling (use contexts sparingly)

### General
- **No hardcoded credentials** - use environment variables
- **No Tailwind classes** on new frontend code
- **Always scope by tenant** (`restaurant_id`)
- **Ask before large refactors** - confirm approach first

## Common Patterns

### Adding a New Feature
1. Create ORM model in `app/db/models/<domain>_orm.py` with `restaurant_id`
2. Create repository extending `BaseRepository`
3. Create service with `(db, restaurant_id, subscription_tier, employee_id)` constructor
4. Create DTOs in `app/schemas/<domain>_dto.py`
5. Create routes in `app/api/v1/<domain>_routes.py` with `@log_route()`
6. Add service to `app/api/dependencies.py` via `build_service`
7. Update frontend interfaces and API client
8. Add TanStack Query hooks for data fetching

### Permission Gating
```python
@router.post("/items")
async def create_item(
    _: None = Depends(check_permissions(["create_inventory"])),
    service: InventoryService = Depends(build_service(InventoryService))
):
    ...
```

### Tier-based Features (Frontend)
```tsx
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <>
      {user.subscription_tier === 'basic' && <BasicOverview />}
      {user.subscription_tier === 'pro' && <ProOverview />}
      {user.subscription_tier === 'master' && <MasterOverview />}
    </>
  );
};
```

## Environment Setup

### Backend
```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start  # Runs on http://localhost:3000
```

### Mobile
```bash
cd mobile
npm install
npm start  # Expo dev server
```

### Environment Variables
Required in `.env`:
```bash
# Database
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=prep_iq

# Auth
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# POS Integration
ENCRYPTION_KEY=your_fernet_key
SQUARE_CLIENT_ID=...
SQUARE_CLIENT_SECRET=...
SQUARE_WEBHOOK_SIGNATURE_KEY=...
SQUARE_ENVIRONMENT=sandbox  # or production
```

## Key Files Reference

| Purpose | Location |
|---------|----------|
| App entry | `main.py` |
| Auth middleware | `app/core/middleware.py` |
| DB session | `app/db/session.py` |
| Base repository | `app/repositories/base_repository.py` |
| Dependencies | `app/api/dependencies.py` |
| Logger config | `app/core/logging.py` |
| EOD runner | `app/utils/eod_runner.py` |
| Forecasting engine | `app/services/forecasting_engine.py` |
| Web layout | `frontend/src/components/Layout.jsx` |
| Web theme | `frontend/src/theme.ts` |
| Mobile entry | `mobile/src/App.tsx` |
| Mobile theme | `mobile/src/theme.ts` |

## Documentation
- Architecture overview: `AGENTS.md`
- API docs: `http://localhost:8000/docs` (FastAPI auto-generated)
- Technical guides: `docs/` directory
- POS integration: `docs/POS_INTEGRATION.md`

## Working with Claude

When you mention `@claude` in GitHub issues or PRs:
1. **Be specific**: Reference file paths, function names, and line numbers
2. **Provide context**: Include error messages, stack traces, expected vs actual behavior
3. **State the goal**: "Add feature X", "Fix bug Y", "Refactor Z for better performance"
4. **Ask questions**: If unsure about implementation approach, ask before coding

Examples:
- ❌ "Fix the inventory page"
- ✅ "Fix the inventory page calculation error in `frontend/src/pages/inventory/InventoryOverview.tsx:145` where total cost is showing NaN"

- ❌ "Add POS integration"
- ✅ "Add Toast POS provider following the pattern in `app/integrations/pos/square_provider.py`, implementing OAuth and webhook verification"

---

**PrepIQ** - Preparing restaurants for success, one prediction at a time.
