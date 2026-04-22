# RAG Ingestion Guide

## Status

This is the canonical guide for preparing PrepIQ repo content for LLM/RAG ingestion. It explains which sources are authoritative, how to rank stale or legacy content, and where ambiguity is dangerous.

## Recommended Source Priority

Use this ranking when sources conflict:

1. Lowercase RAG maps in `docs/`: `system-overview.md`, `frontend-map.md`, `backend-map.md`, `database-map.md`, `feature-matrix.md`, `core-workflows.md`, `gaps-and-legacy.md`.
2. Active navigation and route wiring: `frontend/src/components/data/sidebarData.js`, `frontend/src/routes/AppRoutes.tsx`, `mobile/src/navigation/sidebarData.ts`, `mobile/src/navigation/routes.tsx`, and `main.py`.
3. Mounted route modules in `app/api/v1/*_routes.py`.
4. Services and helpers in `app/services/` and `app/services/helpers/`.
5. ORM models in `app/db/models/*_orm.py` plus SQL migrations in `scripts/migrations/`.
6. Existing uppercase docs as domain deep dives when they match current code.
7. `notes/` and seed/demo files as supplemental examples, not canonical product contracts.

Do not rank a page, route, or service as active only because a file exists.

## Canonical Sources By Question Type

| Question type | Canonical source |
| --- | --- |
| What pages are available? | `frontend/src/components/data/sidebarData.js`, then `frontend/src/routes/AppRoutes.tsx`; for mobile, `mobile/src/navigation/sidebarData.ts` and `routes.tsx`. |
| Is a backend endpoint active? | `main.py` router includes, then the mounted route module. |
| What does an endpoint do? | Mounted route module and service method. |
| What data exists? | ORM models first, migrations second, services for calculated meaning. |
| What tier sees a feature? | Sidebar data and `feature-matrix.md`; account for client tier normalization. |
| How does a workflow work? | `core-workflows.md`, then services/routes for details. |
| What is legacy or inactive? | `gaps-and-legacy.md` plus evidence from missing route/sidebar mounting. |
| How does the assistant work? | `ASSISTANT_IMPLEMENTATION_STATUS.md`, `ASSISTANT_RETRIEVAL_DESIGN.md`, `backend-map.md`, and assistant service/helper code. |

## Domain Terminology

| Term | Meaning |
| --- | --- |
| Restaurant | Tenant root. Most data is scoped by `restaurant_id`. |
| Basic tier | Product-facing lower tier shown in client navigation. |
| Full tier | Product-facing advanced tier. Implemented by clients as normalized non-basic backend tier. |
| Pro/master | Deprecated backend tier aliases for the full tier. Runtime code normalizes these to `full`; migration `0018_migrate_subscription_tier_to_full.sql` converts stored restaurant tiers. |
| Menu item | Sellable item. Sales and forecasts generally attach here. |
| Recipe | Production formula for a menu item or component. Can contain ingredients, batches, or other recipes. |
| Batch recipe | Prep/bulk recipe used by prep planning and ingredient breakdown. |
| Ingredient supplier | Vendor-specific purchasing record for an ingredient. It carries cost, lead time, pack size, cadence, and preference data. |
| Inventory lot | Receipt-level stock bucket with delivery/spoilage dates and remaining quantity. |
| Forecast run ledger | Per-restaurant/day forecast pipeline state. |
| EOD run ledger | Per-restaurant/day end-of-day pipeline state. |
| PO suggestion | Reorder recommendation generated from forecast, policy, stock, lot, and supplier data. |

## Dangerous Ambiguity Areas

### Tier Names

The product is `basic` and `full`. Old backend/schema examples may mention `basic/pro/master`, but current runtime tier handling normalizes `pro/master` to `full` and a migration converts stored tiers. Do not invent a current three-tier product model.

### Active Versus Present

Files for team, admin diagnostics, live operations, kitchen/waiter, and internal POS-adjacent flows exist, but several are not active navigation or mounted API surfaces. Team/timekeeping and internal POS are not current product areas. Index them with low active-status weight unless a user asks specifically about legacy or code-resident cleanup.

### POS Surfaces

External POS integration is active through settings, Square provider code, webhooks, and mapping models. Internal POS is not being used right now; older terminal/cash-drawer routes are absent or not surfaced. Do not answer as if an active `/api/v1/pos` route group exists.

### Mounted Route Bugs

`/pos/mappings` is mounted, but route code appears to treat `CurrentUser` as a dictionary. Mark this surface as active-but-suspect.

### Page Names

Legacy component names such as `MasterOverview` and `MenuMixInsightsPro` may appear under the product-facing full tier. Prefer product tier wording in user-facing answers.

### Assistant Retrieval

The current assistant scans `docs/` and `notes/` with heuristic retrieval and uses selected live service context. It does not yet have uploaded-file indexing, persistent document metadata, vector search, or write-capable MCP tools.

### Forecast And Reorder Freshness

Forecast state matters. Reorder suggestions may use cached EOD forecast breakdowns or fresh forecast computation. Avoid claiming every PO suggestion is based on live recomputation.

### Tenant Scope

Every operational answer should assume restaurant-scoped data. Cross-tenant reads are not part of normal behavior.

## Suggested Metadata For Chunks

Use these metadata fields when indexing:

| Field | Example values |
| --- | --- |
| `source_path` | `docs/backend-map.md`, `app/services/inventory_service.py` |
| `source_type` | `canonical_doc`, `deep_dive_doc`, `route`, `service`, `model`, `migration`, `client_route`, `legacy_candidate`, `note` |
| `product_area` | `auth`, `dashboard`, `sales_forecast`, `menu`, `inventory`, `prep`, `analytics`, `alerts`, `admin`, `settings`, `pos`, `assistant`, `database` |
| `layer` | `frontend`, `mobile`, `backend`, `database`, `docs`, `integration` |
| `active_status` | `active`, `hidden_route`, `mounted_suspect`, `code_resident`, `unmounted`, `legacy`, `deprecated`, `unknown` |
| `tier` | `basic`, `full`, `raw_pro_master`, `all`, `unknown` |
| `route_prefix` | `/api/v1/inventory`, `/api/v1/sales_forecast` |
| `service` | `InventoryService`, `SalesForecastService` |
| `table` | `inventory_lots`, `forecasts` |
| `workflow` | `sales_upload`, `eod`, `reorder_generation`, `assistant_query` |
| `confidence` | `high`, `medium`, `low` |

## Chunking Guidance

- Chunk canonical docs by heading; keep table rows with their heading context.
- Chunk route modules by prefix and route handler group.
- Chunk large services by method clusters rather than arbitrary line windows.
- Chunk ORM models one model/class at a time with relationship fields nearby.
- Chunk sidebar data by tier and section.
- Chunk migrations individually and tag schema changes by affected table.
- Keep legacy/dead-code evidence in the same chunk as the explanation.

## Retrieval Weighting

High weight:

- lowercase canonical docs
- active sidebar and route files
- `main.py`
- mounted routes and services
- ORM models for schema questions

Medium weight:

- uppercase domain deep dives that match current code
- tests that exercise current behavior
- migration scripts that created current fields

Low weight:

- unmounted routes
- page files absent from active navigation
- old internal POS, kitchen, waiter, and team/timekeeping surfaces
- broken/stale setup scripts such as `app/db/init_db.py`
- planning docs that predate implemented assistant work

## Answering Rules For A PrepIQ LLM

- State uncertainty when source wiring conflicts.
- Prefer active navigation and mounted routes over broad historical docs.
- Explain tenant scope and tier normalization when relevant.
- Do not promise write-capable assistant behavior; phase 1 is read-only.
- For operational facts, distinguish live structured state from procedural docs.
- For schema questions, cite ORM models but use services to explain business meaning.
- For feature availability, answer from `feature-matrix.md` and sidebar wiring.
