# PrepIQ MCP Implementation Plan

## Summary

PrepIQ now has a safe MCP action layer mounted at `/mcp`. The layer is designed for LLM-driven workflows, but it treats RAG as advisory context and uses existing PrepIQ services as the write boundary.

Execution flow:

1. Resolve intent with RAG or structured context.
2. Validate MCP tool input with strict schemas.
3. Authenticate the caller with the existing PrepIQ JWT.
4. Enforce authenticated tenant scope and tier checks.
5. Run live service-backed preflight validation.
6. Require dry-run confirmation for high-risk tools.
7. Execute through existing services.
8. Persist audit/idempotency state.

## Architecture

- MCP package: `app/mcp_server/`
- Transport: official Python MCP SDK/FastMCP streamable HTTP mounted at `/mcp`
- Auth: existing PrepIQ JWTs via an MCP `TokenVerifier`
- Tenant scope: derived only from the JWT/database actor context; tools never accept `restaurant_id`
- Role permissions: not required for MCP v1; active authenticated PrepIQ users can call MCP, with tier and service validation still enforced
- RAG boundary: `prepare_action_context` and optional dry-run context are advisory only
- Persistence: `mcp_action_audit` stores action attempts, confirmation state, idempotency keys, and outcomes

## Tool Mapping

- Orders use `OrderService`.
- Menu items and recipes use `MenuService`.
- Batch recipes use `PrepService`.
- Supplier links and inventory corrections use `InventoryService`.
- Purchase-order lookup, reorder-backed suggestions, draft creation, draft edits, status changes, and receipts use `InventoryService`.
- Name-to-ID lookup uses `AssistantEntityResolver` through `resolve_entities` before mutation tools receive final IDs.
- Sales imports use `DashboardService.upload_sales_entries`.

No generic CRUD, raw SQL, hard delete, admin mutation, or direct model-mutation tool is exposed.

## Guardrails

- Strict Pydantic schemas reject unknown fields.
- Every mutation requires an `idempotency_key`.
- Users without `role_id` are allowed when the employee is active and scoped to the authenticated restaurant.
- Full-tier-only areas are blocked for basic-tier actors.
- High-risk tools require dry-run and a short-lived HMAC confirmation token.
- Confirmation tokens bind tool, tenant, employee, risk level, and canonical payload hash.
- Audit records are written for successful, denied, failed, dry-run, and confirmation-required attempts.
- Errors are normalized for MCP clients and do not expose stack traces.

## Implementation Order

1. Added MCP SDK dependency and mounted `/mcp`.
2. Added strict schemas and tool registry.
3. Added JWT auth, active-user checks, tier checks, confirmation tokens, and normalized errors.
4. Added service adapters that route to existing domain services.
5. Added RAG preflight adapter using existing assistant context/retrieval and restaurant OpenAI key resolution.
6. Added audit/idempotency table, repository, and migration.
7. Added focused MCP tests and documentation.

## Purchase Orders

The POS/customer-order tools (`create_order`, `update_order`, `change_order_status`) intentionally target PrepIQ's customer/POS order domain through `OrderService`. Vendor purchasing is exposed separately through purchase-order tools.

Recommended LLM purchasing flow:

1. Use `list_inventory_stock_levels`, `list_ingredient_suppliers`, or `get_purchase_order_suggestions` for structured retrieval.
2. Prefer `get_purchase_order_suggestions`, which uses the existing reorder forecast engine and supplier-selection rules.
3. Use `create_purchase_orders_from_suggestions` to create draft/cart purchase orders from live validated suggestions.
4. Use manual `create_purchase_order` or draft item-edit tools only when the operator has supplied explicit purchasing details.
5. Use `change_purchase_order_status` to submit or move non-receipt status; use `receive_purchase_order` for delivered inventory because receipt creates inventory lots and updates stock.

## Compromises And Future Work

- Purchase-order writes create draft/cart documents or controlled receipts only; no MCP tool submits orders to external vendors.
- `get_purchase_order_suggestions` calls `InventoryService.generate_purchase_order_suggestions(..., manage_alerts=False)` so MCP retrieval does not create low-stock alerts.
- `create_purchase_orders_from_suggestions` revalidates every submitted suggestion against live generated suggestions before writing draft POs.
- The first audit persistence layer stores one row per idempotency key rather than a full event stream.
- Existing tenants need migration `0019_create_mcp_action_audit.sql` applied so the audit table exists.
- Schema validation failures rejected by the MCP SDK before tool execution may not create an audit row.
