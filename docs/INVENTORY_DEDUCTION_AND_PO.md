# Inventory Deduction And Purchase Orders

## Purpose

This document describes the current inventory and purchase-order behavior that matters most to operators and future assistant features.

It focuses on the current inventory service surfaces, PO suggestion behavior, and the trust model around forecast-backed purchasing.

See also:

- `FORECASTING_SYSTEM.md` for the shared forecast status model used by forecast pages and PO suggestions
- `EOD_PIPELINE.md` for the EOD summary surface that carries related forecast trust metadata

## Inventory Scope

The inventory domain currently covers:

- inventory table and details
- lot-level inventory
- stock movements
- supplier relationships
- ingredient supplier links
- inventory adjustments and set-current-stock flows
- discrepancy reporting
- purchase-order generation, review, update, receive, and item-level changes

## Purchase Order Lifecycle

The backend currently supports:

- manual purchase-order creation
- listing and detail retrieval
- status updates
- receiving orders
- adding, updating, and deleting PO items
- generating forecast-based suggestions
- creating draft orders from suggestions

## PO Suggestion Sources

Current suggestion generation supports two forecast modes:

- cached EOD forecast reuse
- fresh on-demand forecasting

The response includes forecast source metadata so downstream UI and operators can see whether suggestions came from:

- recent finalized EOD forecast data
- fresh on-demand forecast execution
- degraded fallback to cached forecast after fresh forecast failure

## Current Forecast-Aware Suggestion Behavior

`InventoryService.generate_purchase_order_suggestions()` currently:

1. checks the restaurant's recent finalized EOD run context
2. loads recent forecast metadata
3. attempts to use cached ingredient forecast breakdowns when configured
4. optionally runs a fresh forecast pipeline
5. falls back to cached finalized EOD forecast when fresh generation fails or produces unusable output
6. returns forecast state fields alongside suggestion output

## Suggestion Response Trust Model

Current purchasing responses can report:

- `forecast_source`
- `forecast_source_type`
- `forecast_generated_at`
- `forecast_reused`
- `forecast_stale`
- `forecast_status`
- `forecast_status_message`
- `forecast_confidence_score`
- `forecast_version`

This means PO suggestions already expose trust metadata and should not be treated as unqualified recommendations.

For retrieval and explanation purposes, this is the same trust model described in `FORECASTING_SYSTEM.md`, applied to purchasing rather than sales screens.

## Supplier Selection

The current PO suggestion flow considers:

- supplier availability for the ingredient
- preferred supplier selection logic
- lead time
- minimum order quantity
- pack size and supplier unit information

Cadence-aware replenishment is now part of the live reorder suggestion path. Ingredient-supplier links can carry:

- review period days
- order schedule type
- allowed order days
- allowed delivery days
- cadence source and confidence metadata

Supplier selection also records review context that can explain how a supplier was chosen.

## Cadence-Aware Replenishment Configuration

The repository now stores the first layer of the cadence-aware replenishment design:

- ingredient-level replenishment policy fields
- ingredient-supplier cadence fields
- shared normalization and schedule-resolution helpers
- web and mobile editing surfaces for cadence metadata
- cadence-aware protection window calculation in manual PO suggestions
- cadence-aware protection window calculation in EOD PO suggestions
- usable-stock projection from available lots so stock that expires before the next replenishment window can be excluded from reorder math

The remaining follow-on work is narrower now:

- explanation UIs can expose more of the new cadence fields directly
- deeper spoilage-rate learning can still be layered on top of the current expiry-aware usable-stock projection

## Deduction And Discrepancy Context

Inventory behavior also includes discrepancy-oriented surfaces such as:

- deduction discrepancy list
- discrepancy history
- stock movement views
- lot information and usage-log access

This matters because purchasing quality depends on inventory quality.

## Reliability Notes

Inventory and purchasing outputs should be treated carefully when:

- no finalized reusable forecast exists
- forecast output is degraded or stale
- inventory deduction discrepancies remain open
- supplier links or packaging data are incomplete

## Documentation Rule

Any operator-facing or assistant-facing explanation of suggested purchasing should include:

- the forecast source
- whether the forecast was reused or freshly generated
- forecast freshness and degraded/failed state
- whether follow-up review is required before submitting orders

## Assistant Implications

The future assistant should answer purchasing questions using structured retrieval from inventory and PO services, not from generic reasoning over historical docs alone.

High-value assistant questions include:

- What should I order and why?
- Are these suggestions based on fresh or reused forecast data?
- Which purchase orders are still drafts?
- Are there unresolved discrepancies affecting stock trust?
