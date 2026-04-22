# MCP Risk Notes

## Dangerous Areas

- Inventory corrections can affect purchasing, stock movement views, EOD discrepancy resolution, and operator trust.
- Sales imports feed forecasting and EOD workflows, so duplicate or overwritten sales must be deliberate.
- Order completion writes sales and may trigger real-time inventory deduction for full-tier tenants.
- Recipe and batch recipe updates replace component lists and can materially change forecasting and deduction behavior.
- Supplier preference/link changes can affect reorder recommendations.
- Purchase-order receipts create inventory lots and update on-hand stock; they must be treated like inventory mutations.
- Purchase-order suggestions are forecast-driven and should expose the forecast contract before creating draft POs.

## Current Limitations

- MCP schema validation failures rejected before tool execution may not write audit rows.
- The audit table records final state per idempotency key; it is not a full append-only approval ledger.
- MCP v1 does not enforce legacy role permissions. Any active authenticated user can reach MCP tools, with tenant scope, tier gating, confirmation, idempotency, audit, and domain-service validation as the safety boundary.
- RAG document retrieval depends on a configured restaurant or server OpenAI key.
- MCP does not place orders with external vendors; it creates internal draft/cart POs and receives them into inventory.
- Manual purchase-order creation can create unspecified-supplier drafts, but supplier-specific drafts require ingredient-supplier links so receipts remain safe.

## Future Hardening

- Add an append-only audit event table for every retry/approval attempt.
- Add per-tool rate limits and tenant-level MCP enablement settings.
- Add more granular order-line editing tools once domain rules are clearer.
- Add richer structured read tools for entity resolution before mutation.
- Add formal approval UI for high-risk MCP actions.
- Add external vendor submission adapters only after explicit operator approval and vendor-specific safeguards exist.
- Add migration coverage to the deployment workflow.

## Assumptions To Validate

- Production deployments should decide whether to add a tenant-level MCP enablement flag before broad rollout.
- Full-tier gating is appropriate for recipes, batch recipes, supplier links, and inventory corrections.
- Sales import through MCP should always require confirmation, even when `overwrite=false`.
- Supplier link mutations should require confirmation until preferred-supplier business rules are more explicit.
- Reorder-backed PO creation should use finalized EOD suggestions when possible; on-demand forecast previews should remain review-first.
