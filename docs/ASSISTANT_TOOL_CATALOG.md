# Assistant Tool Catalog

## Status

Document retrieval is live with persisted indexing, and structured context assembly is partially live. This file tracks what the backend assistant currently uses versus what is still planned.

## Phase 1 Read Tools

### `forecast_summary`

- status: live in simple context-builder form
- source service: `SalesForecastService`
- purpose: answer forecast, freshness, confidence, and top-item forecast questions
- output shape: summary plus freshness and confidence metadata
- safety notes: must surface stale or degraded forecast state when present

### `inventory_snapshot`

- status: live in simple context-builder form
- source service: `InventoryService`
- purpose: answer current stock and low-stock questions
- output shape: inventory summary and item-level stock signals
- safety notes: read-only; no stock adjustments in phase 1

### `alerts_summary`

- status: live in simple context-builder form
- source service: `AlertsService`
- purpose: answer current alert and urgency questions
- output shape: active alerts, severity, and action labels
- safety notes: read-only; no alert acknowledgements in phase 1

### `po_suggestion_summary`

- status: live in simple context-builder form
- source service: `InventoryService`
- purpose: explain purchase-order suggestions and forecast trust context
- output shape: PO summary plus forecast-state metadata
- safety notes: no PO creation in phase 1

### `eod_summary`

- status: live in simple context-builder form
- source service: `EODService`
- purpose: answer EOD status and run-summary questions
- output shape: run status, summary, and operator guidance
- safety notes: no EOD finalization in phase 1

## Phase 1 Document Retrieval Sources

- `docs/` architecture and operations docs
- `notes/` markdown and internal notes
- uploaded assistant files stored and indexed per restaurant

Current live note:

- uploaded `.md`, `.txt`, and `.pdf` files are indexed through `/assistant/documents/upload`

### `document_upload_indexer`

- status: live
- source module: `AssistantIndexingService`
- purpose: store uploaded files, extract text, chunk content, embed chunks, and write metadata plus vectors for retrieval
- output shape: document metadata plus indexed chunk rows
- safety notes: tenant-scoped; requires configured assistant OpenAI key or server fallback key

### `builtin_document_reindex`

- status: live
- source module: `AssistantIndexingService`
- purpose: lazily or manually reindex `docs/` and `notes/` when built-in knowledge changes
- output shape: indexed document count
- safety notes: checksum-aware to avoid unnecessary re-embedding

## Disabled Future Write Tools

### `create_purchase_order_draft`

- status: disabled
- future source service: `InventoryService`
- why disabled: requires approval flow and audit trail

### `adjust_inventory`

- status: disabled
- future source service: `InventoryService`
- why disabled: operationally sensitive

### `acknowledge_alert`

- status: disabled
- future source service: `AlertsService`
- why disabled: user action tracking not implemented yet

### `finalize_eod`

- status: disabled
- future source service: `EODService`
- why disabled: must never run autonomously in phase 1
