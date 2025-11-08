# Master Tier End-of-Day (EOD) Pipeline – Function Inventory & Execution Map

> Scope: `EODService`, `ForecastingEngine` (advanced), `ReorderForecastEngine`, `InventoryStatsService`.
> Goal: Show exact (intended) execution order, what triggers what, completion status, risks, and recommended improvements. Brutally candid.
>
> NOTE: Several functions inside `forecasting_engine.py` have placeholder bodies or omitted blocks (`/* Lines … omitted */`). Their statuses are marked accordingly.

---

## 1. High-Level Execution Sequence (Intended Master Tier)

1. `EODService.finalize_end_of_day_summary(date, ...)` – Orchestrator (entrypoint for EOD). Likely sequence inside (body not visible; inferred):

   - `check_sales_data_exists(date)`
   - `aggregate_daily_sales(date)`
   - `deduct_ingredients_from_inventory(usage_summary)`
   - `auto_deduct_spoilage(date)` (placeholder)
   - `generate_forecast(forecast_horizon_days, reorder_horizon_days)` → activates `ForecastingEngine.run_forecasting_pipeline()`
   - `reorder_engine` path: `generate_suggested_purchase_orders(ingredient_forecast)` → each ingredient triggers ABC classification, inventory stats, safety stock, reorder quantity.
   - `write_purchase_orders_to_db()`
   - `evaluate_forecast_accuracy()` (yesterday accuracy)
   - `inventory_stats` or `reorder_engine.classify_all_ingredients()` (not explicitly shown in orchestrator; recommended to run periodically, e.g. weekly/monthly.)
   - `write_forecast_to_db(forecast_results)` (currently `pass`; expected after forecast generation if not already in forecasting pipeline.)
   - Commit / error handling / summary return.

2. `ForecastingEngine.run_forecasting_pipeline()` – Generates forecasts, breakdowns, ingredient demand, accuracy evaluation triggers, alerting.
3. `ReorderForecastEngine.suggest_reorder_quantity()` – For each ingredient, derives reorder amount using inventory stats + ABC + safety stock.
4. `InventoryStatsService.*` – Provides usage averages, std dev, shelf life, lead time, MOQ, etc. Used by reorder logic & ABC classification.

---

## 2. Module Function Inventories

### A. `EODService` (app/services/eod_service.py)

| Order (relative) | Function                                                         | Status                 | Purpose                                                                              | Footnotes / Risks                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0                | `__init__`                                                       | Done                   | Wires repos + engines for forecasting & reordering.                                  | No transaction grouping; consider central session management & explicit commit boundaries.                                                                       |
| 1                | `check_sales_data_exists(date)`                                  | Partial (body omitted) | Should verify sales presence before proceeding.                                      | Needs clear return contract (count? bool?). Must short-circuit pipeline gracefully.                                                                              |
| 2                | `aggregate_daily_sales(date)`                                    | Partial                | Builds usage summary (ingredients + batch recipes) from sales.                       | Core loops incomplete (omitted blocks for recipe traversal); risk of under-deduction. Must handle recipe → ingredient + batch mapping fully.                     |
| 3                | `deduct_ingredients_from_inventory(usage_summary)`               | Partial                | Performs FIFO deduction from inventory and logs usage.                               | Critical logic omitted (sale and batch branches). Must ensure atomicity + lot selection order + negative stock prevention.                                       |
| 4                | `auto_deduct_spoilage(target_date)`                              | Placeholder            | Spoilage deduction (stub).                                                           | Needs expiry scan across lots, produce alerts, usage logging.                                                                                                    |
| 5                | `generate_forecast(forecast_horizon_days, reorder_horizon_days)` | Done (wrapper)         | Calls advanced forecasting pipeline; returns ingredient-level forecast.              | Depends on completeness of `ForecastingEngine.run_forecasting_pipeline`.                                                                                         |
| 6                | `generate_suggested_purchase_orders(ingredient_forecast)`        | Partial                | Builds supplier-specific purchase order suggestions per ingredient forecast horizon. | Many omitted lines: supplier selection, inventory conversion, shelf life retrieval, pack sizing, error handling. Needs idempotency & skip logic for zero-demand. |
| 7                | `write_purchase_orders_to_db()`                                  | Partial                | Persists aggregated suggestions grouped by supplier.                                 | Omitted body → currently non-functional; must implement grouping, upsert, and transactional rollback on failure.                                                 |
| 8                | `evaluate_forecast_accuracy()`                                   | Partial                | Compares yesterday forecast vs actual sales.                                         | Depends on missing `ForecastingEngine.get_forecast_for_date`. Should write to daily accuracy table.                                                              |
| 9                | `write_forecast_to_db(forecast_results)`                         | Not Implemented        | Intended to persist forecasts (if not already handled upstream).                     | Overlap with `ForecastingEngine.write_forecast_results`. Clarify ownership to prevent duplicate writes.                                                          |
| 10               | `finalize_end_of_day_summary(...)`                               | Partial (body omitted) | Orchestrates entire EOD pipeline.                                                    | Needs explicit ordering, error isolation, summary metrics, idempotency, concurrency locks (prevent double-run).                                                  |
| —                | `process_batch_recipe_production(date)`                          | Partial                | Processes scheduled batch prep tasks marking completion/inventory adjustments.       | Not integrated into main sequence; should occur before usage deduction to avoid double counting.                                                                 |

### B. `ForecastingEngine` (app/services/forecasting_engine.py)

| Role       | Function                                      | Status       | Purpose                                                                                          | Footnotes                                                                               |
| ---------- | --------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Setup      | `__init__`                                    | Done         | Wires repositories & internal state caches.                                                      | Good separation; consider lazy loading to reduce init overhead.                         |
| Setup      | `initialize`                                  | Done (no-op) | Backward compatibility hook.                                                                     | Can be removed if not used externally.                                                  |
| Alerts     | `_raise_alert`                                | Done         | Uniform alert creation with meta.                                                                | Ensure severity taxonomy aligned with Alert schema.                                     |
| Accuracy   | `evaluate_and_record_daily_forecast_accuracy` | Partial      | Writes daily accuracy records per menu item.                                                     | Commit logic truncated; sales loop partially omitted; risk of silent failures.          |
| Accuracy   | `evaluate_and_record_accuracy`                | Partial      | Evaluates historical forecast accuracy across past forecasts.                                    | Missing metric computation; should call `_compute_forecast_accuracy_metrics`.           |
| Accuracy   | `_compute_forecast_accuracy_metrics`          | Placeholder  | Calculate MAPE, R2, other metrics per menu item.                                                 | Must integrate existing `mape` util; consider storing residual variance for confidence. |
| Confidence | `_derive_confidence_score`                    | Partial      | Combines metrics into a confidence scalar.                                                       | Omitted aggregation specifics; ensure weighting documented.                             |
| Retraining | `should_retrain_model`                        | Placeholder  | Decide whether to retrain model based on thresholds.                                             | Must read last metrics timestamp & drift conditions.                                    |
| Training   | `train_menu_item_model`                       | Placeholder  | Train H2O GBM for a menu item.                                                                   | Needs data extraction, feature matrix, model persistence via `save_model`.              |
| Features   | `_build_feature_matrix`                       | Placeholder  | Build DataFrame of features (sales history, calendar, weather).                                  | Must guard missing weather rows; include future exogenous variables.                    |
| Weather    | `ensure_weather_for_range`                    | Placeholder  | Populate missing weather records for forecast horizon.                                           | Consider concurrency control & external API rate limiting.                              |
| Forecast   | `generate_forecast`                           | Placeholder  | Produce horizon predictions per date.                                                            | Should fallback gracefully if model not present (e.g. naive average).                   |
| Persist    | `write_forecast_results`                      | Placeholder  | Write forecasts + breakdown rows and update caches.                                              | Ensure idempotent writes; versioning and replace semantics.                             |
| Data Prep  | `_prepare_sales_dataframe`                    | Placeholder  | Convert raw sale ORM list to tabular form.                                                       | Standardize columns (date, qty, dow, month, is_holiday).                                |
| Breakdown  | `generate_batch_recipe_breakdown`             | Partial      | Expand menu item forecasts into batch prep quantities.                                           | Omitted loops for bridging recipes → batch. Validate yield math.                        |
| Breakdown  | `generate_ingredient_breakdown`               | Partial      | Convert forecasts + batch breakdown into ingredient demand.                                      | Omitted recipe + batch loops; must unify unit normalization.                            |
| Prep       | `generate_batch_prep_suggestions`             | Partial      | Suggest batch productions within horizon.                                                        | Missing filtering heuristics (thresholding).                                            |
| Reorder    | `aggregate_ingredient_demand_for_reorder`     | Partial      | Aggregate ingredient forecast demand over horizon.                                               | Omitted accumulation logic; ensure alignment with reorder horizon.                      |
| Meta       | `log_forecast_metadata`                       | Done         | Debug logging of forecast usage metadata.                                                        | Consider persisting a `forecast_version` table.                                         |
| Pipeline   | `run_forecasting_pipeline`                    | Placeholder  | Orchestrate full advanced forecast cycle (train → predict → breakdown → accuracy eval → alerts). | Central missing piece; implement soon to enable EOD continuity.                         |
| Fallback   | `derive_ingredient_usage_from_sales`          | Partial      | Builds pseudo-forecast from historical sales for usage derivation.                               | Good fallback; ensure performance for large windows.                                    |
| Utility    | `convert_forecast_dict_to_list`               | Partial      | Normalize forecast dict to list of (date, qty).                                                  | Missing loop body; trivial to finish.                                                   |

### C. `ReorderForecastEngine` (app/services/reorder_forecast_engine.py)

| Order (per ingredient) | Function                                      | Status          | Purpose                                                 | Notes                                                                                                                |
| ---------------------- | --------------------------------------------- | --------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1                      | `classify_abc_item`                           | Done            | Returns ABC class (cached).                             | Relies on existing `abc_class` column; no dynamic ranking unless `classify_all_ingredients` used.                    |
| 2                      | `calculate_safety_stock`                      | Done            | Computes safety stock via Z _ stddev _ sqrt(lead_time). | Uses population std dev (pstdev upstream) – fine for deterministic daily usage; consider demand variability scaling. |
| 3                      | `get_average_daily_usage` (via stats service) | Done (in Stats) | Required input for reorder point & lead demand.         | Fallback logic handles sparse usage logs.                                                                            |
| 4                      | `calculate_reorder_point`                     | Done            | lead_demand + safety_stock.                             | Could incorporate service-level cycle stock nuance later.                                                            |
| 5                      | `calculate_max_order`                         | Done            | Enforces max stock cap if defined.                      | Returns `Infinity` string when no cap → prefer `None` for type clarity.                                              |
| 6                      | `suggest_reorder_quantity`                    | Done            | Applies ABC weighting & MOQ, clamps to max stock.       | Relies on external lead/shelf demand computation by caller; may ignore pack-size rounding until later step.          |
| 7                      | `classify_all_ingredients`                    | Done            | Recomputes ABC classes from consumption value.          | Should run periodically, not per EOD (costly). Lacks batching/parallelism; potential performance issue.              |
| 8                      | `create_low_stock_alert`                      | Done            | Emits alert when stock below reorder point.             | No dedup logic; could spam daily. Add uniqueness constraint (ingredient + date).                                     |

### D. `InventoryStatsService` (app/services/inventory_stats_service.py)

| Function                      | Status | Purpose                                                             | Footnotes                                                                 |
| ----------------------------- | ------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `get_average_daily_usage`     | Done   | Mean daily usage (prefers logs, falls back to sales-derived usage). | Uses `len >= 14` heuristic; parameterize threshold?                       |
| `get_std_dev_usage`           | Done   | Population std dev of daily usage.                                  | Fallback mirrors average path; consider sample std dev for small N (<30). |
| `get_current_inventory`       | Done   | Returns on-hand quantity & unit.                                    | No lot-level granularity; acceptable for reorder.                         |
| `get_lead_time_days`          | Done   | From preferred or lowest-priority supplier.                         | Defaults to 1 if missing – may over-aggressively reduce safety stock.     |
| `get_moq`                     | Done   | Minimum order quantity.                                             | Defaults to 1 – consider pulling supplier-level default.                  |
| `get_max_stock_level`         | Done   | Ingredient max stock policy.                                        | Missing unit normalization vs inventory unit mismatch potential.          |
| `get_shelf_life_days`         | Done   | Shelf life or default 30.                                           | Should align with supplier pack life if provided.                         |
| `get_total_usage_last_n_days` | Done   | Sum usage (logs or sales-derived).                                  | Good for ABC classification; ensure performance with long-range windows.  |

---

## 3. Activation Graph (Simplified)

```
finalize_end_of_day_summary
  ├─ check_sales_data_exists
  ├─ aggregate_daily_sales
  │    └─ menu_item_recipe_repo → recipe_ingredient_repo / batch_recipe_repo
  ├─ deduct_ingredients_from_inventory
  │    └─ inventory_repo / inventory_lot_repo / inventory_usage_log_repo
  ├─ auto_deduct_spoilage (stub)
  ├─ generate_forecast
  │    └─ ForecastingEngine.run_forecasting_pipeline (PLACEHOLDER)
  │         ├─ train_menu_item_model / should_retrain_model (PLACEHOLDER)
  │         ├─ generate_forecast (PLACEHOLDER)
  │         ├─ write_forecast_results (PLACEHOLDER)
  │         ├─ generate_batch_recipe_breakdown (PARTIAL)
  │         ├─ generate_ingredient_breakdown (PARTIAL)
  │         └─ aggregate_ingredient_demand_for_reorder (PARTIAL)
  ├─ generate_suggested_purchase_orders
  │    ├─ ReorderForecastEngine.suggest_reorder_quantity
  │    │    ├─ InventoryStatsService.get_* (COMPLETE)
  │    │    ├─ ReorderForecastEngine.calculate_* (COMPLETE)
  │    │    └─ create_low_stock_alert
  ├─ write_purchase_orders_to_db (PARTIAL)
  ├─ evaluate_forecast_accuracy (PARTIAL)
  └─ write_forecast_to_db (NOT IMPLEMENTED)
```

---

## 4. Completion Summary & Risk Hotspots

| Category                               | Completion Level     | Highest Risk Areas                                                                |
| -------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| Inventory Deduction                    | <50% (logic omitted) | Incorrect usage mapping, negative inventory, lack of FIFO enforcement.            |
| Forecast Generation (Advanced)         | <30%                 | Core pipeline placeholders: model training, feature matrix, forecast writing.     |
| Forecast Accuracy                      | <40%                 | Metric computation + daily records incomplete; no confidence propagation.         |
| Reordering Logic                       | ~80%                 | Pack-size rounding & Infinity return type, potential over-order for sparse usage. |
| ABC Classification                     | ~90%                 | Performance on large ingredient sets; no batching.                                |
| Alerts                                 | ~70%                 | Missing deduplication; may flood logs/users.                                      |
| EOD Orchestration                      | ~50%                 | finalize function body omitted; transactional/idempotent handling absent.         |
| Data Writes (PO / Forecast / Accuracy) | ~40%                 | Missing atomic grouping; partial writes risk inconsistent downstream state.       |

---

## 5. Brutal Assessment

1. The EOD pipeline’s backbone (`finalize_end_of_day_summary` + advanced forecasting + inventory deduction) is structurally outlined but materially incomplete, jeopardizing reliability for the “bread and butter” claim.
2. Forecasting engine core advanced functions are largely stubs; current system likely falls back to simplistic or absent forecasting, weakening reorder precision.
3. Inventory deduction logic being missing means reorder suggestions are probably based on on-hand values that never decrement accurately—high false positives/negatives.
4. Purchase order writing is not implemented; even if suggestions are generated, they won’t persist—blocking downstream supplier workflows.
5. Accuracy evaluation incomplete—no feedback loop to improve forecasting or trigger retraining, making ML static and potentially degrading over time.
6. Lack of transactional boundaries (no explicit commit/rollback segmentation) risks partial EOD runs leaving mixed inventory, forecast, and PO states.
7. Alerting strategy could spam low-stock alerts daily for persistent shortages; needs rate limiting or suppression rules.
8. `ReorderForecastEngine` is over-indexing on ABC classification without dynamic recency weighting (e.g. demand seasonality). Safety stock formula is simplistic (normal assumption) and ignores forecast error distribution.
9. Absence of idempotency (e.g., “has EOD for date X already run?” guard) risks double deductions if service retried.
10. Missing explicit versioning for forecasts; overwrites could occur silently, hindering traceability and audit.

---

## 6. Recommended Improvements (Prioritized)

| Priority | Improvement                                                                                                  | Rationale                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| P0       | Complete inventory deduction core (ingredient & batch branches with FIFO, unit normalization).               | Enables accurate reorder decisions; foundational correctness. |
| P0       | Implement `run_forecasting_pipeline` minimally (naive baseline + breakdown + persistence).                   | Unblocks downstream ingredient demand aggregation.            |
| P0       | Add idempotency & locking in `finalize_end_of_day_summary` (e.g., EODRun table or redis lock).               | Prevent double execution.                                     |
| P1       | Finish purchase order persistence with transaction bundling & status fields (Suggested → Pending Approval).  | Activates actionable procurement flow.                        |
| P1       | Implement `_compute_forecast_accuracy_metrics` + daily accuracy recording & retraining trigger.              | Self-healing forecast quality.                                |
| P1       | Wrap entire EOD orchestration in try/segment pattern: each stage logs outcome; rollback on critical failure. | Reliability & observability.                                  |
| P2       | Add alert deduplication (unique key: alert_type + ingredient_id + date).                                     | Reduces noise.                                                |
| P2       | Replace `Infinity` with `None` in `calculate_max_order`; enforce numeric domain in downstream math.          | Type safety & predictable serialization.                      |
| P2       | Optimize ABC classification (batch query usage sums; run weekly).                                            | Performance scaling.                                          |
| P3       | Integrate probabilistic safety stock (service-level adaptation using forecast error variance).               | Inventory cost vs service optimization.                       |
| P3       | Introduce forecast versioning table (id, created_at, horizon, model_hash).                                   | Auditability & rollback.                                      |
| P3       | Add pack-size aware rounding earlier (in reorder quantity suggestion) to avoid double rounding.              | Cleaner PO suggestion numbers.                                |
| P4       | Weather enrichment, holiday calendar injection, exogenous feature caching.                                   | Accuracy improvements.                                        |
| P4       | Implement supplier lead-time dynamic adjustment (based on delays history).                                   | Resilience to supply variability.                             |

---

## 7. Suggested Minimal Completion Path (Incremental)

1. Fill inventory deduction code + unit normalization via `convert_unit`.
2. Implement naive forecast (moving average / last 14-day mean) in `generate_forecast`; persist via `write_forecast_results`.
3. Build ingredient demand aggregation path fully (batch + ingredient breakdown).
4. Wire reorder suggestions → complete PO write path (status = Suggested).
5. Add EODRun guard table (date, completed_at, success_flag, error_stage).
6. Implement forecast accuracy + simple retraining threshold logic (MAPE > 0.25 or R2 < 0.6).
7. Refactor reorder to incorporate forecast confidence (reduce order qty if confidence low).

---

## 8. Open Questions (To Clarify Before Further Build)

- Should forecasting persistence happen only inside the forecasting engine, or also via EOD wrapper (`write_forecast_to_db`)? (Recommend single ownership inside engine.)
- How are partial EOD failures surfaced to operators? (Need alert + dashboard EOD status.)
- Are purchase orders auto-approved or do they require human review/acknowledgment? (Consider approval workflow.)
- Do we require multi-supplier split logic when max_stock insufficient from one supplier? (Future advanced logic.)
- Should ABC classification incorporate volatility (std dev) or margin contribution? (Current pure consumption value may misclassify high-margin low-volume items.)

---

## 9. Final Verdict

The current EOD master pipeline is architecturally sound but operationally incomplete. Core deductions, advanced forecasting steps, persistence layers, and accuracy feedback are either partial or missing. In its current state, reorder suggestions risk being materially wrong due to incomplete inventory deduction and absent true forecast generation. Immediate attention to foundational correctness (inventory deduction + naive forecast + PO persistence + idempotent orchestration) will convert this skeleton into a reliable backbone. Only after that should you invest in higher-complexity features (probabilistic safety stock, weather-driven models, dynamic retraining).

---

## 10. TL;DR

Pipeline skeleton is there; guts (forecast, deduction, accuracy, persistence) need finishing. Tackle P0 items first to avoid cascading bad data. Reordering logic is decent but currently built on shaky inputs.

---

_Document generated: See statuses to guide next sprints._
