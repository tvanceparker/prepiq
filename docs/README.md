# Docs Index

## Purpose

This folder is the curated documentation source for PrepIQ engineers and the internal RAG-powered assistant. The lowercase docs are the current canonical maps generated from route registration, sidebar wiring, service usage, and ORM models. The uppercase docs remain useful deep dives, but some originated before the latest assistant and navigation reconciliation.

## Canonical RAG-Ready Maps

Read these first when answering "what exists now" questions:

- `system-overview.md`
- `frontend-map.md`
- `backend-map.md`
- `database-map.md`
- `feature-matrix.md`
- `core-workflows.md`
- `rag-ingestion-guide.md`
- `gaps-and-legacy.md`

## Core Deep Dives

- `AUTH_AND_TENANCY.md`
- `ARCHITECTURE_OVERVIEW.md`
- `DATA_MODEL.md`
- `SERVICES_INDEX.md`
- `API_SURFACES.md`
- `FEATURE_TIERS.md`

## Operational Deep Dives

- `EOD_PIPELINE.md`
- `FORECASTING_SYSTEM.md`
- `INVENTORY_DEDUCTION_AND_PO.md`
- `REPLENISHMENT_POLICY_ENGINE.md`
- `ALERTS_AND_DIAGNOSTICS.md`
- `INTEGRATIONS.md`

## Client Docs

- `FRONTEND_ARCHITECTURE.md`
- `MOBILE_ARCHITECTURE.md`

## Assistant Docs

- `ASSISTANT_IMPLEMENTATION_STATUS.md`
- `ASSISTANT_RETRIEVAL_DESIGN.md`
- `ASSISTANT_TOOL_CATALOG.md`
- `ASSISTANT_UPLOAD_AND_INDEXING.md`
- `ASSISTANT_RAG_MCP_ROADMAP.md`
- `OPERATOR_KNOWLEDGE_SOURCES.md`

## Recommended Reading Order

1. Start with `rag-ingestion-guide.md` if building or tuning retrieval.
2. Read the canonical maps for current product, frontend, backend, database, tiers, workflows, and legacy areas.
3. Use uppercase docs as focused deep dives.
4. Resolve conflicts by trusting active code wiring first: `main.py`, web/mobile sidebar data, AppRoutes, mounted routes, services, and ORM models.

## Important Source-Of-Truth Rule

File existence does not mean a feature is active. For active pages, trust sidebar data plus route registration. For active APIs, trust `main.py`. For schema, trust ORM models plus migrations. For stale or disconnected areas, see `gaps-and-legacy.md`.
