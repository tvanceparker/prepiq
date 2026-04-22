# Gaps And Legacy

## Status

This file records unclear, stale, disconnected, or likely-unused areas found during the repo-to-docs reconciliation. It is evidence for RAG weighting, not a deletion plan.

## Critical Mismatches

| Area | Evidence | Impact |
| --- | --- | --- |
| Product tier vocabulary | Clients use `basic/full`; older DB rows/docs/tests used `basic/pro/master`. | Migration is underway: runtime tier handling normalizes `pro/master` to `full`, seeds were updated, and migration `0018_migrate_subscription_tier_to_full.sql` converts stored rows. |
| API docs overstated old routes | Older docs listed `kitchen_routes`, `waiter_routes`, and `pos_routes`; those files are absent or not mounted. | Old docs should not be used as active route truth. |
| Team route inactive | `team_routes.py` exists, but `main.py` does not include it. | Team/timekeeping is not a current product area. Treat as legacy/code-resident. |
| Permission route inactive | `permission_routes.py` exists, but `main.py` does not include it. | Permissions are mostly exposed through admin routes today. |
| `/pos/mappings` likely bug | Mounted route uses `current_user["restaurant_id"]` and `.get(...)`, while `get_current_user` returns `CurrentUser`. | Active endpoint group may fail at runtime until fixed. |
| Web login stale POS registration | `frontend/src/pages/auth/Login.tsx` posts to `/pos/register-device` and `/pos/refresh-token`; backend active device route is `/auth/register-device`. | Normal login may be blocked or misdirected when device token is absent. |
| Frontend settings API delete helper | `frontend/src/api/settings.ts` calls `del(...)` without importing it. | Likely TypeScript/build error for assistant key deletion path. |

## Code-Resident But Not Current Primary UI

| Area | Evidence | Current interpretation |
| --- | --- | --- |
| Live operations | Dashboard component/API exists, but no current sidebar/AppRoutes entry. | Hidden/code-resident. |
| EOD summary | Web and mobile route exists, but not in sidebar data. | Hidden route, useful for diagnostics. |
| Admin diagnostics pages | Activity/system health/system alerts/roles access pages exist; sidebar/AppRoutes expose tenant info and users only. | Backend partially active, UI inactive. |
| Team scheduling and clock | Team service/routes/pages/API clients exist; route unmounted and navigation absent. | Not a current product area; legacy/code-resident. |
| Orders/order entry | `/orders` backend is mounted, but no active sidebar order-entry surface. | Backend active, primary UI absent. |
| Kitchen/waiter APIs | Mobile source references exist, but active backend routes/websocket source are absent. | Legacy/inactive. |
| Internal POS terminal/cash drawer | Some migrations/docs reference these concepts, but active route/source wiring is absent. | Not being used; legacy surface. |

## Assistant And RAG Gaps

| Gap | Current state |
| --- | --- |
| Uploaded file indexing | Planned in docs, not implemented as active flow. |
| Vector store | Not active; current retrieval is in-process scanning of `docs/` and `notes/`. |
| Persistent document metadata | Not active. |
| Assistant write/MCP actions | Not active; phase 1 is read-only. |
| Assistant status field | `AssistantService` returns status labels such as `scaffolded` even when generation occurs; wording may lag implementation. |
| Structured PO context | Assistant context builder calls reorder suggestion generation for PO/reorder queries; verify side effects and runtime cost before treating as purely lightweight read. |

## Documentation Mismatches Found

| Document | Issue |
| --- | --- |
| `API_SURFACES.md` | Previously described old `/pos`, kitchen, waiter, and websocket surfaces as active. |
| `ARCHITECTURE_OVERVIEW.md` | Previously listed internal POS/kitchen services and websocket registration as part of active runtime composition. |
| `ASSISTANT_RAG_MCP_ROADMAP.md` | Said assistant was planning-only while implementation status shows phase 1 simple RAG is now present. |
| `FEATURE_TIERS.md` | Updated to state that backend `pro/master` values are deprecated aliases for `full`. |

## Schema And Migration Uncertainty

- SQL migrations are the current migration record; no active Alembic versions directory exists.
- Migration names are mixed and include ad hoc cleanup/backfill scripts.
- `app/db/init_db.py` appears stale because it imports sync session names not exported by the current async session module.
- Some POS terminal/cash-drawer migration artifacts have no matching active ORM/route surface. Internal POS is not being used right now.
- Historical notes and external dumps may still use deprecated backend tiers such as `pro` and `master`.

## Future Documentation TODOs

- Generate an endpoint-by-endpoint OpenAPI snapshot once route bugs and inactive route decisions are resolved.
- Add a model relationship diagram for menu/recipe/batch/inventory/forecast tables.
- Add focused docs for external POS sync and item mapping after `/pos/mappings` is verified.
- Plan or execute cleanup for team/timekeeping code paths now that they are confirmed out of current product scope.
- Plan or execute cleanup for internal POS artifacts now that internal POS is confirmed unused.
- Run and verify the backend/database tier migration in shared environments.
- Decide whether hidden EOD summary should become a sidebar diagnostics page.
- Add tests or documented smoke checks for assistant query, assistant settings, and POS settings flows.
