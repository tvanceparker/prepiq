# PrepIQ MCP Server

## Architecture

The PrepIQ MCP server is mounted at `/mcp` and uses FastMCP streamable HTTP. It exposes narrow business tools that call existing PrepIQ services rather than mutating the database directly.

The server package lives in `app/mcp_server/`:

- `server.py`: FastMCP setup and Starlette app creation
- `tools.py`: public tool registration
- `schemas.py`: strict tool input models
- `executor.py`: auth, active-user/tier checks, dry-run, confirmation, idempotency, audit, and error handling
- `service_adapters.py`: service-backed business actions
- `rag.py`: advisory RAG/context retrieval
- `confirmation.py`: HMAC confirmation tokens
- `auth.py`: PrepIQ JWT verification

## Request Pattern

Mutation tools accept a single `payload` object. Mutation payloads always include:

- `idempotency_key`
- optional `dry_run`
- optional `confirmation_token`
- optional `operator_intent`
- optional `include_rag_context`

High-risk tools must be called with `dry_run=true` first. The response returns a `confirmation_token`. The client then replays the same payload with `dry_run=false` and the token.

Read-only retrieval tools such as `list_purchase_orders`, `get_purchase_order`, `list_ingredient_suppliers`, `list_inventory_stock_levels`, and `get_purchase_order_suggestions` do not require idempotency keys and do not write audit rows.

The POS/customer-order tools use PrepIQ's customer order domain. Vendor purchase orders use the dedicated purchase-order tools.

When an operator gives names instead of IDs, call `resolve_entities` first. For example, resolve `"chicken breast"` and `"heavy cream"` as `ingredient` before calling `create_recipe`.

## Auth Model

MCP requests use the existing PrepIQ Bearer JWT. The MCP layer validates the token, verifies the employee is active, and reloads the current restaurant tier from the database.

Tools do not accept tenant identifiers. `restaurant_id` always comes from authenticated context, so the agent should not ask the operator for restaurant ID or tier before using tools.

## RAG Safety Model

RAG is used for planning context, SOPs, uploaded docs, and explanations. RAG is never authoritative for:

- legacy role permissions
- tenant scope
- tier access
- inventory quantities
- final entity IDs
- mutation approval

Final execution always validates against live services and repositories.

For purchasing, the preferred LLM workflow is:

1. Retrieve structured context with `get_purchase_order_suggestions`.
2. Present the forecast authority, supplier grouping, and item quantities for review.
3. Dry-run `create_purchase_orders_from_suggestions`.
4. Replay with the confirmation token. The MCP layer revalidates each suggestion against live reorder output before creating draft/cart purchase orders.
5. Use `receive_purchase_order` only when the operator confirms delivery details; receipt creates inventory lots and stock movement side effects.

## Audit Model

Mutation attempts write to `mcp_action_audit` with:

- actor and restaurant
- tool name
- idempotency key
- canonical payload hash
- risk and confirmation state
- input summary
- result summary or error code
- timestamps

Idempotent replays of successful mutations return the stored result without executing the service again.

## Extension Guidance

New tools should:

- expose one business action, not generic CRUD
- use a strict schema with `extra="forbid"`
- never accept `restaurant_id`
- map to an existing service or add a shared service method first
- define tier requirements and risk/confirmation behavior in `registry.py`
- add preflight checks in `service_adapters.py`
- add tests for schema, auth, tier gating, idempotency, and audit behavior
