# Assistant Implementation Status

## Status

In progress. A usable phase 1 read-only RAG slice now exists across backend, web, and mobile, and the retrieval stack now includes persisted indexing and vector search.

## Completed So Far

- created a feature branch for assistant work: `feat/assistant-rag-v1`
- added backend restaurant-level assistant settings endpoints under `/settings/assistant`
- added encrypted per-restaurant OpenAI key storage fields on the restaurant model
- added a generic secret encryption utility for assistant secrets
- added a database migration for assistant secret fields
- added web Integration Settings UI for assistant enablement and OpenAI key management
- added mobile Integration Settings UI parity for assistant enablement and OpenAI key management
- scaffolded backend assistant query endpoint under `/assistant/query`
- added a repo `.env.example` with assistant and encryption placeholders
- implemented persisted document metadata and chunk storage for assistant sources
- implemented upload and indexing support for `.md`, `.txt`, and `.pdf` assistant documents
- implemented OpenAI embeddings and database-backed vector retrieval for indexed chunks
- kept lexical rescue and heuristic reranking on top of vector retrieval for answer quality
- implemented heuristic reranking and neighbor expansion for retrieved document chunks
- implemented read-only structured context assembly for alerts, forecast, EOD, PO suggestions, and inventory snapshot queries
- added a global web assistant floater available across authenticated pages
- added a global mobile assistant overlay available across authenticated screens
- added a web assistant upload surface and manual built-in reindex action
- added the `chef_garlic` avatar to the web assistant panel using the uploaded GLB asset

## Current Scope

Phase 1 remains read-only.

Included:

- restaurant-scoped assistant settings
- encrypted OpenAI key storage
- web settings management
- mobile settings management
- global assistant chat entry on web and mobile
- indexed retrieval from `docs/`, `notes/`, and uploaded assistant files
- persisted document and chunk metadata in the application database
- OpenAI embeddings plus database-backed vector similarity search
- read-only structured live-data context from existing backend services

Excluded for now:

- write execution
- MCP action approval flow
- model-based reranking
- mobile upload UI

## Next Implementation Targets

1. add mobile upload and document-management parity
2. move embeddings from database JSON storage to a dedicated vector backend if scale demands it
3. add message persistence and session history beyond in-memory client state
4. add approval-gated MCP action flows after the read path settles
5. evaluate model-based reranking only if answer quality requires it

## Notes

- the assistant OpenAI key is not returned to clients after save
- the settings API returns masked key status only
- backend resolution order is restaurant key first, then env fallback
- local development should set `ENCRYPTION_KEY` to avoid ephemeral encryption warnings
- built-in sources are checksum-aware when reindexed so unchanged docs are not re-embedded unnecessarily
- uploaded files are stored under a server-managed assistant uploads directory and indexed within the current restaurant scope
