# Auth And Tenancy

## Purpose

This document describes the current authentication flow, request-context model, and tenant-scoping rules that shape the rest of the system.

## Authentication Model

PrepIQ uses JWT-based authentication.

The backend receives bearer tokens and uses them in two layers:

- middleware for best-effort request-state extraction
- route dependencies for actual authentication and authorization enforcement

## Middleware Behavior

`AuthExtractionMiddleware` decodes the bearer token when possible and populates `request.state` with:

- `username`
- `restaurant_id`
- `subscription_tier`

Important behavior:

- middleware does not reject requests on its own
- invalid tokens are logged and skipped
- actual 401 behavior is left to route dependencies so responses still flow through FastAPI correctly

This makes middleware contextual, not authoritative.

## Route Dependency Behavior

The main backend auth dependency is `get_current_user` in `app/api/dependencies.py`.

It decodes the JWT and constructs `CurrentUser` with:

- `username`
- `restaurant_id`
- `subscription_tier`
- `employee_id`
- `name`
- `role_id`

This object is the main user-context contract used by service construction.

## Service Construction Pattern

Most backend services are created through `build_service(...)` and receive:

- `db`
- `restaurant_id`
- `subscription_tier`
- `employee_id`

This pattern is the standard mechanism for tenant-aware business logic.

## Permission Model

The backend also supports permission-aware access through `check_permissions(...)`.

Current behavior:

- if `role_id` is absent, shared-access v1 behavior can bypass granular permission enforcement
- if `role_id` is present, permissions are checked against role-permission records scoped to the same restaurant

This permission model still exists, but it should be treated as a task-specific or legacy-style infrastructure surface rather than the default framing for all new v1 feature work.

This means permission checks are role-aware and tenant-aware.

## Tenancy Model

PrepIQ is multi-tenant by restaurant.

The operational rule is:

- normal application reads and writes must stay inside the current `restaurant_id`

This is enforced primarily through repository construction and query patterns.

## Repository Pattern

Repositories are expected to receive:

- `db`
- `restaurant_id`

Normal tenant-bound repositories should inherit from `BaseRepository` so restaurant filtering remains consistent.

This is one of the most important data-isolation rules in the system.

## Client Auth Model

### Web

The web client stores and restores auth session information through local storage.

Current stored state includes:

- token
- user
- tier
- preferences
- theme

The web auth context also normalizes tier values so non-basic backend tiers become `full` in client access logic.

### Mobile

The mobile client mirrors the same pattern through async storage.

Current stored state includes:

- token
- user
- tier
- preferences
- theme

Mobile also normalizes backend tiers into `basic` versus `full` for client access behavior.

## Device And POS Auth Context

The backend also supports device-token extraction for POS-oriented flows.

This device context includes values such as:

- `device_id`
- `device_type`
- `restaurant_id`
- `fingerprint`

This is separate from normal user JWT context and is used for device-bound POS flows.

Current route caveat: active backend device registration is exposed under `/api/v1/auth/register-device`. Older client code may still reference `/pos/register-device` or `/pos/refresh-token`; those should be treated as stale unless matching routes are restored.

## Documentation Rule

When documenting auth-sensitive or tenant-sensitive behavior:

- distinguish middleware context extraction from enforced auth dependencies
- distinguish backend tier values from client-normalized tier buckets
- keep `restaurant_id` isolation explicit
- treat permission checks and tenant checks as related but different concerns

## Assistant Implications

The current read-only assistant, and any future MCP action layer, must inherit the same trust model:

- all reads must stay scoped to the current `restaurant_id`
- tier and permission context must influence available capabilities
- write-capable tools must use the same approval and audit boundaries as the rest of the backend
