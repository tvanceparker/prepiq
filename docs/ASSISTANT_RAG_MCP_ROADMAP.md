# Assistant, RAG, And MCP Roadmap

## Status

Partially superseded by implementation. The phase 1 read-only assistant slice now exists across backend, web, and mobile; see `ASSISTANT_IMPLEMENTATION_STATUS.md` and `ASSISTANT_RETRIEVAL_DESIGN.md`.

This document remains useful as roadmap guidance for future MCP-style write actions and possible retrieval infrastructure upgrades. Do not read its earlier "future only" framing as proof that no assistant exists.

## Purpose

This document describes the recommended architecture for adding an operator-facing assistant to PrepIQ.

It is intentionally separate from the current production architecture docs because parts of the assistant and MCP layers remain planned work. The shipped portion today is read-only Q&A with indexed retrieval over `docs/`, `notes/`, and uploaded files plus selected structured service context.

## Recommended Framing

The first assistant should be treated as a hybrid retrieval system, not a pure vector-only RAG system.

The reason is simple:

- many operator questions are about live structured restaurant state
- some questions are procedural and document-oriented
- some need both

## Phase 1 Goal

Phase 1 should provide read-only operator assistance for questions about the current restaurant and its workflows.

That includes:

- inventory and purchasing questions
- forecast and sales questions
- recipe and prep questions
- alerts and settings questions
- onboarding and procedure questions

It should not include autonomous write actions.

## Recommended Phase 1 Architecture

Phase 1 has been started in the current codebase. The actual implementation uses `app/api/v1/assistant_routes.py`, `app/services/assistant_service.py`, helper modules under `app/services/helpers/`, `app/integrations/openai_client.py`, web/mobile assistant UI components, and settings APIs under `/settings/assistant`.

### 1. Keep The Assistant Inside The Existing Backend First

The assistant should begin as a backend capability inside the existing FastAPI application.

Reasons:

- it can reuse existing auth and tenant context
- it can reuse the current service layer
- it keeps `restaurant_id` scoping inside the same trust boundary
- it simplifies auditing and operational rollout

### 2. Use Three Retrieval Paths

The assistant should route each question into one of these paths:

- structured operational retrieval
- document retrieval
- blended retrieval

### 3. Structured Retrieval Sources

High-value sources for phase 1:

- `SalesForecastService`
- `InventoryService`
- `MenuService`
- `PrepService`
- `AlertsService`
- `SettingsService`

### 4. Document Retrieval Sources

High-value document targets:

- architecture and workflow docs in `docs/`
- curated setup and troubleshooting docs
- future operator-facing procedure documents

### 5. Model And Vector Strategy

Recommended approach:

- OpenAI for answer generation and embeddings
- a vector-store abstraction in the backend
- document indexing for procedural knowledge
- curated summary indexing rather than raw transactional row embedding

Because the current app uses MySQL, do not force a PostgreSQL-only vector choice into the architecture just for this feature.

## Recommended Implementation Shape

Suggested backend files:

```text
app/api/v1/assistant_routes.py
app/schemas/assistant_dto.py
app/services/assistant_service.py
app/services/helpers/assistant_query_router.py
app/services/helpers/assistant_context_builder.py
app/services/helpers/assistant_indexing_service.py
app/integrations/openai_client.py
app/integrations/vector_store.py
```

Actual current note: the codebase has query routing, context building, prompt building, upload-aware indexing, heuristic reranking, OpenAI client integration, and a database-backed vector retrieval path. A dedicated external vector database is not active yet.

Suggested client surfaces:

```text
frontend/src/pages/settings/AssistantSettings.tsx
frontend/src/pages/settings/hooks/useAssistant.ts
mobile/src/pages/settings/AssistantScreen.tsx
```

## Response Requirements

The assistant should return answers with:

- source labels
- timestamps where relevant
- stale or degraded status when known
- forecast confidence or caveat metadata when relevant
- clear separation between live-state answers and procedural guidance

## Why Not Use Raw Code As RAG Context

The assistant should not use arbitrary service code as its primary runtime context because:

- code is implementation-oriented, not operator-oriented
- code paths may contain partial, fallback, or internal-only logic
- service outputs are a safer and more stable retrieval boundary

Code should guide retrieval design, not replace retrieval design.

## Phase 2 Goal: MCP-Style Actions

Once the read path is trustworthy, add an action layer.

This layer should:

- expose explicit tools mapped to existing service methods
- require explicit user approval before writes
- log all action attempts and approvals
- remain tenant-scoped and role-aware

## First MCP-Style Actions To Consider

- create purchase-order draft
- add items to a draft order
- create recipe draft
- submit onboarding or configuration payloads
- update supplier preferences

## Approval Model

Write actions should follow this pattern:

1. assistant proposes action
2. assistant gathers missing arguments
3. user approves explicitly
4. backend executes via approved service path
5. result is logged and returned

## Documentation Dependency

The assistant does need documents, but not for everything.

It needs documents primarily for:

- onboarding
- how-to guidance
- troubleshooting
- approvals and policy explanation

It needs structured backend integration for:

- live restaurant state
- current forecasts
- current inventory and purchase orders
- alerts

## Recommended Delivery Order

1. top-level architecture docs
2. operational deep-dive docs
3. operator knowledge-source docs
4. backend assistant API design
5. read-only assistant implementation
6. approval-gated MCP actions
