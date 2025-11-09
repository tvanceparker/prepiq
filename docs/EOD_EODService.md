# EODService Detailed Inventory & Execution Analysis

> File: `app/services/eod_service.py`
> Tier Focus: Master (Basic path noted but not expanded)
> Purpose: Central orchestrator for end-of-day processing: usage aggregation, inventory deduction, spoilage handling (stub), forecasting handoff, ABC classification, reorder suggestion, purchase order persistence, accuracy evaluation.
>
> Legend: Status — ✅ Complete | ⚠ Partial | ❌ Missing | 🔄 Improvement Proposed

---

## 1. Constructor & Dependency Wiring

### `__init__(db, restaurant_id, subscription_tier, employee_id=None)` ✅

Initializes all repository dependencies and service collaborators:

- Repos: Sales, MenuItem, MenuItemRecipe, Recipe, RecipeIngredient, BatchRecipe, BatchRecipeIngredient, IngredientSupplier, PurchaseOrder, PurchaseOrderItem, PrepSchedule, InventoryLot, Ingredient, Inventory, Alert, InventoryUsageLog.
- Services: `ForecastingEngine` (advanced), `ReorderForecastEngine`, `InventoryStatsService`, and conditionally (later) `ForecastingEngineBasic` for basic tier.
  Notes:
- No explicit transaction strategy or connection lifecycle management.
- Employee context unused; consider using for attribution of system actions (e.g., EOD run metadata).
  Risks: Missing idempotency guard and run metadata record.
  Suggestions: Introduce an `EODRunRepository` to log start/end, success flag, and error stage.

---

## 2. Batch Prep Status

### `process_batch_recipe_production(date)` ⚠

Purpose: Scan scheduled batch preps not completed; raise alerts.
Behavior:

- Fetches scheduled preps by date; for any with `status != 'completed'`, inserts an alert.
  Side Effects: Writes Alert rows.
  Missing: Does not adjust inventory or mark preps as failed; no severity—uses generic `prep_incomplete` type.
  Risks: Silent accumulation of stale prep schedules; no escalation or auto-cancel.
  Suggestions:
- Add severity and a follow-up action field (e.g., `needs_reschedule`).
- Optionally auto-create a next-day reschedule entry.

---

## 3. Usage Aggregation

### `aggregate_daily_sales(date)` ✅

Purpose: Convert sales into a usage summary of ingredients and batch recipes.
Flow:

1. Query sales for date; early exit if none.
2. For each sale:
   - Retrieve linked menu item recipes.
   - Traverse each recipe’s ingredients.
   - Accumulate ingredient usage (quantity_used \* quantity_sold) and batch recipe counts.
3. Return unified usage list: ingredient entries (source='sale') and batch recipe entries (source='batch').
   Side Effects: None (pure aggregation).
   Risks:

- Potential performance overhead per sale due to N+1 queries (recipes + recipe ingredients per menu item). Consider prefetch/bulk methods.
- No unit conversion at this stage—assumes recipe units map directly to inventory units later.
  Suggestions:
- Add repository method for bulk retrieval: recipes + ingredients in one call.
- Include optional debug metrics (e.g., total ingredients processed).

---

## 4. Inventory Deduction

### `deduct_ingredients_from_inventory(usage_summary)` ✅

Purpose: Apply aggregated usage to inventory records (ingredients & batch recipes) and log usage.
Ingredient path:

- Fetch inventory by ingredient_id.
- Convert usage unit to inventory unit if needed.
- Decrement inventory, log usage in `inventory_usage_log_repo`.
  Batch path:
- Fetch all lots for batch_recipe_id, derive inventory_ids.
- Normalize units to first inventory unit; proportionally deduct across inventories FIFO-like (simple ordering by delivery_date).
- Log usage referencing batch recipe.
  Returns: Dict summary with counts and deducted items.
  Risks:
- Raises `ValueError` for missing inventory; could abort entire EOD run. Consider graceful skip with alert.
- FIFO implementation is shallow; lots fetched but deduction occurs at inventory level, not lot level — potential mismatch of real lot consumption.
- Silent unit conversion fallback with potential rounding errors.
  Suggestions:
- Implement true lot-level deduction (update lot remaining qty, mark depleted).
- Replace direct ValueError with alert logging + continue path where sensible.
- Wrap each deduction in a small transaction to avoid partial batch deduction inconsistent states if one fails.

---

## 5. Spoilage Handling

### `auto_deduct_spoilage(target_date)` ⚠ (Placeholder)

Purpose: Deduct spoilage automatically.
Current: Logging only.
Missing:

- Logic to scan inventory lots for expiration/shelf life violation.
- Action pathway (deduct & log usage_type='spoilage').
  Risks: Spoilage untracked → reorder suggestions inflate demand incorrectly.
  Suggestions:
- Implement `InventoryLotRepository.get_expired_lots(as_of_date)`.
- Deduct quantities, log spoilage usage, emit low-stock or waste alerts.

---

## 6. Forecast Generation Wrapper

### `generate_forecast(forecast_horizon_days, reorder_horizon_days)` ✅

Purpose: Prepare horizon values, initialize forecasting engine, run advanced pipeline.
Return: Ingredient-level aggregated demand for reorder horizon.
Risks:

- No guard for empty result — caller handles but could add diagnostics here.
  Suggestions:
- Capture forecast version & confidence summary in returned payload for EOD summary metrics.

---

## 7. Reorder Suggestion Construction

### `generate_suggested_purchase_orders(ingredient_forecast)` ✅

Purpose: Turn ingredient demand forecasts into purchase order suggestion objects before DB write.
Flow per ingredient:

1. Supplier selection (preferred by priority → fallback lowest priority).
2. Gather lead time, pack sizing, shelf life (from inventory or supplier).
3. Compute lead + shelf windows; derive lead_demand, shelf_demand.
4. Call `reorder_engine.suggest_reorder_quantity` (ABC, safety stock, MOQ).
5. Convert unit to supplier unit; compute packs & total ordered.
   Output: `self.purchase_order_suggestions` list of structured dicts.
   Risks:

- If inventory_unit is None (no current inventory), unit conversion may fail.
- No safeguard when supplier_unit differs semantically from inventory unit (e.g., weight vs count) beyond convert_unit.
- Potential performance issues with sequential async calls per ingredient for suppliers and inventory.
  Suggestions:
- Bulk fetch suppliers and inventory records ahead of loop.
- Add confidence-based adjustment (e.g., reduce order qty if forecast confidence < threshold).
- Track reason for skipping (e.g., reorder_qty <= 0) in a separate diagnostics list.

---

## 8. Purchase Order Persistence

### `write_purchase_orders_to_db()` ✅

Purpose: Group suggestions by supplier, write order header + items, then update total price.
Process:

- Group by supplier_id.
- Create order with placeholder price.
- Loop items, compute item total price, accumulate.
- Update order with final total.
  Risks:
- No transactional rollback if partial failure after some items written.
- Price retrieval via `ingredient_supplier_repo.get_price_per_unit` per item (N+1); consider caching.
- No status progression beyond "pending".
  Suggestions:
- Wrap per-supplier operation in a transaction (begin/commit/rollback).
- Introduce order version or audit trail.
- Add `currency` field alignment.

---

## 9. Forecast Accuracy (Legacy/Adjunct)

### `evaluate_forecast_accuracy()` ⚠

Purpose: Compare forecast vs actual for yesterday; write daily accuracy metrics.
Issues:

- Calls `self.forecasting_engine.get_forecast_for_date()` — this method does NOT exist in `ForecastingEngine` (potential runtime error).
- Treats `actuals` (list of sales rows) like a dict; `actuals.get(key, 0)` will fail. Needs transformation to dict keyed by `(restaurant_id, menu_item_id)`.
  Risks: Currently broken; could silently fail or raise exceptions blocking EOD summary.
  Suggestions:
- Implement `ForecastingEngine.get_forecast_for_date(forecast_date)` returning dict keyed by `(restaurant_id, menu_item_id)`.
- Convert sales list into dict for actual lookups.
- Use existing `evaluate_and_record_daily_forecast_accuracy` instead (already implemented).

---

## 10. Orchestration

### `finalize_end_of_day_summary(date, commit=True, forecast_horizon_days=30, reorder_horizon_days=30)` ✅ (Operational but Enhancements Needed)

Purpose: Master-tier EOD pipeline sequence.
Sequence (Master branch):

1. Aggregate usage.
2. Deduct inventory (if any usage).
3. Spoilage placeholder.
4. Run forecast pipeline → ingredient demand.
5. ABC classification across all ingredients.
6. Generate purchase suggestions.
7. Write purchase orders.
   Return summary counts.
   Error Handling: Try/except; rollback on exception if transaction support present.
   Missing:

- Idempotency: No check to prevent multiple runs same date.
- Partial failure isolation (e.g., if PO writing fails after deduction succeeded).
- Logging detail (no stage-by-stage timing metrics).
  Suggestions:
- Add `EODRun` record (start_time, end_time, date, status, stage, error_message).
- Stage segmentation with explicit commit after deduction; continue to forecasting even if reorder fails.
- Add optional `dry_run=True` mode.

---

## 11. Sales Data Existence Check

### `check_sales_data_exists(date)` ✅

Purpose: Wrapper around repository method to verify presence of sales.
Note: Not currently used inside orchestrator; could short-circuit early.
Risks: Orchestration does not skip inventory deduction when no sales (though aggregate returns empty list). Low risk.
Suggestion: Integrate early exit for clarity.

---

## 12. Forecast Persistence Placeholder

### `write_forecast_to_db(forecast_results)` ❌

Purpose: Undefined; duplication risk (forecast persistence handled by `ForecastingEngine.write_forecast_results`).
Suggestion: Remove or implement only if you need a higher-level aggregation persistence (e.g., ingredient demand snapshots). Clarify ownership.

---

## 13. Cross-Service Activations

| EODService Function                  | Activates / Depends On                                                                                             | Notes                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `aggregate_daily_sales`              | SalesRepository, MenuItemRecipeRepository, RecipeIngredientRepository, IngredientRepository, BatchRecipeRepository | Pure read aggregation.                                                        |
| `deduct_ingredients_from_inventory`  | InventoryRepository, InventoryLotRepository, InventoryUsageLogRepository                                           | Writes & logs usage; triggers inventory state changes.                        |
| `auto_deduct_spoilage`               | (intended InventoryLotRepository)                                                                                  | Stub—will eventually write deductions.                                        |
| `generate_forecast`                  | ForecastingEngine.run_forecasting_pipeline                                                                         | Returns aggregated ingredient demand.                                         |
| `generate_suggested_purchase_orders` | ReorderForecastEngine, InventoryStatsService, IngredientSupplierRepository                                         | Depends on forecast output shape: `{ingredient_id: {daily_breakdown, unit}}`. |
| `write_purchase_orders_to_db`        | PurchaseOrderRepository, PurchaseOrderItemRepository, IngredientSupplierRepository                                 | Final persistence to orders table.                                            |
| `evaluate_forecast_accuracy`         | ForecastingEngine (missing method), SalesRepository, ForecastRepository                                            | Currently broken path.                                                        |
| `finalize_end_of_day_summary`        | All above                                                                                                          | Orchestrator—error handling & summary.                                        |

---

## 14. Risk Summary (Master Tier)

| Risk                                                       | Impact                                 | Mitigation                                                     |
| ---------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------- |
| Missing forecast accuracy method (`get_forecast_for_date`) | Accuracy eval fails → no feedback loop | Implement method or remove legacy function.                    |
| No idempotency lock                                        | Double deductions & duplicate POs      | Add EODRun lock keyed by (restaurant_id, date).                |
| Inventory deduction raises ValueError                      | Entire EOD aborts                      | Switch to alert + skip for missing inventory.                  |
| Batch deduction not lot-granular                           | Incorrect aging & spoilage modeling    | Deduct from lots FIFO and mark depleted.                       |
| Supplier/unit conversion errors skip silently              | Under-ordering                         | Collect conversion failures and raise aggregated alert.        |
| No transaction segmentation                                | Mixed partial state                    | Commit after deduction; use nested transactions or savepoints. |
| Accuracy function uses wrong data structure                | Runtime exceptions                     | Refactor to reuse daily accuracy method.                       |
| Spoilage not implemented                                   | Overstated stock → late reorder        | Implement spoilage stage before reorder suggestions.           |

---

## 15. Suggested Improvement Roadmap

Priority tiers: P0 (Critical), P1 (Important), P2 (Enhancement), P3 (Refinement)

| Priority | Item                                       | Description                                                   |
| -------- | ------------------------------------------ | ------------------------------------------------------------- |
| P0       | Idempotency & EODRun table                 | Prevent duplicate runs + audit log.                           |
| P0       | Fix `evaluate_forecast_accuracy` or remove | Eliminate broken code path; rely on existing engine methods.  |
| P0       | Lot-level deduction                        | Adjust individual lots; handle depletion and expiration.      |
| P1       | Spoilage deduction implementation          | Scan expired lots; deduct & log.                              |
| P1       | Partial failure resilience                 | Stage-based commits + continue when feasible.                 |
| P1       | Forecast confidence in reorder             | Scale reorder qty by confidence score threshold bands.        |
| P2       | Bulk prefetch for aggregation              | Reduce N+1 query overhead for recipes.                        |
| P2       | Alert deduplication                        | Prevent repeating same low-stock or prep-incomplete alerts.   |
| P2       | Add dry-run mode                           | Simulate EOD without writes for debugging.                    |
| P3       | Extended audit trails                      | Per-stage timings, row counts, cost metrics.                  |
| P3       | Predictive spoilage modeling               | Use shelf life & forecast to anticipate future spoilage risk. |

---

## 16. TL;DR

`EODService` mostly works for Master tier: aggregation, deduction, forecasting, reorder suggestions, and PO writes are implemented. Key gaps: idempotency, spoilage handling, accuracy evaluation fix, and deeper inventory fidelity (lot-level). Address P0 items to stabilize; then optimize performance and forecasting-reorder integration quality.

---

_Generated for deep operational clarity—use this as a sprint planning input._
