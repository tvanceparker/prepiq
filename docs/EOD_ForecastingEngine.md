# ForecastingEngine Detailed Inventory & Execution Analysis

> File: `app/services/forecasting_engine.py`
> Tier: Master / Pro (Advanced pipeline with H2O + weather + breakdowns)
> Purpose: Train per–menu-item models, generate forecasts with exogenous features, compute and persist accuracy, derive ingredient & batch breakdowns for reorder logic.
>
> Legend: Status — ✅ Complete | ⚠ Partial (working but improvable) | ❌ Missing/Problem | 🔄 Improvement Proposed

---

## 1. Core Initialization

### `__init__(db, restaurant_id, subscription_tier=None, model=None)` ✅

Wires all repositories (sales, menu items, recipes, ingredients, forecast tables, accuracy tables, weather, restaurants) and initializes internal state caches:

- `accuracy_metrics`, `latest_menu_item_forecasts`, `latest_batch_breakdown`, `latest_ingredient_breakdown`, `latest_aggregated_ingredient_demand`, `menu_item_confidence`.
  Risks: No lazy loading; upfront repository instantiation overhead (acceptable). No versioning/metadata table for model management.
  Suggestions: Add a small `ForecastModelRegistry` to track versions, training timestamps, performance metrics for audit.

### `initialize()` ✅ (No-op)

Retained for backward compatibility; logs debug. Could be removed or repurposed to check model registry integrity.

---

## 2. Alert & Accuracy Helpers

### `_raise_alert(alert_type, message, severity='warning', meta=None, employee_id=None)` ✅

Creates an alert row with system role. Flexible meta payload. Risks: No throttling or dedup; potential repeated alerts (e.g., missing sales daily). Suggest dedup by `(alert_type, date)`.

### `evaluate_and_record_daily_forecast_accuracy(evaluation_date)` ✅

Computes per-day accuracy for each forecast breakdown row:
Flow:

1. Fetch breakdowns for target date.
2. Gather actual sales aggregated by menu_item_id.
3. Compute `forecast_error` and MAPE via `mape()` helper.
4. Skip if record already exists (idempotent check).
5. Commit only if new rows were added.
   Status: ✅ Works.
   Risks: Assumes forecasted quantity integer rounding already done; if actual sales missing, sets error accordingly. Could store additional distribution metrics (e.g., absolute error). Suggest: Add `abs_error` or `directional_bias` field.

### `evaluate_and_record_accuracy(forecast_date)` ✅

Evaluates accuracy over complete forecast periods ending before (forecast_date - 1):
Flow: Fetch historical forecasts, skip if accuracy already exists, compute aggregated period accuracy with SMAPE (via `mape`), R², MAE, MSE, RMSE.
Status: ✅ Working end-to-end.
Risks: SMAPE formula used through `mape(pred, actual)` may not align with standard period SMAPE when `actual=0`. Suggest: Adopt explicit SMAPE calculation or fallback rules.
Suggestions: Persist additional metrics into a `forecast_period_accuracy` table (if separate from `forecast_accuracy_repo`).

### `_compute_forecast_accuracy_metrics(menu_item_id)` ✅

Returns dict with `mape`, `r2`, `mae`, `mse`, `rmse` for latest forecast of a menu item using row-by-row breakdown vs actual sales.
Risks: For days with zero actuals, MAPE can become `None`; retraining logic interprets `None` as threshold failure → retrain more often than necessary. Suggest fallback to large sentinel (e.g., 200% or exclude zero-actual days by design).

### `_derive_confidence_score(metrics)` ✅

Combines scaled (1 - MAPE%) and R² (with negative R² adjustment) averaged. Returns None if metrics empty. Risks: Treats MAPE as percent already; expects metric in `0-100` domain. Weighted average equal weighting; consider reliability weighting (e.g., R² weight increases with sample size or forecast horizon coverage).

### `should_retrain_model(menu_item_id, threshold_mape, threshold_r2)` ✅

Logic: Load existing model; compute accuracy; retrain if MAPE > threshold or R² < threshold or metrics missing. Risks: Retrains frequently for sparse data sets; H2O startup overhead. Suggest adding minimum retrain interval (e.g., once per N days) or moving window drift detection.

---

## 3. Model Training & Features

### `train_menu_item_model(menu_item_id, lookback_days=90)` ✅

Builds feature DataFrame, enforces min rows, trains H2O GBM on calendar + lag + weather + previous forecast/error features, persists model. Returns (model, metrics). Robust error handling.
Risks:

- No hyperparameter tuning grid; static config may underfit/overfit.
- No cross-validation; only hold-out split.
- Weather enrichment limited (lag features only). Suggest adding rolling precipitation aggregation (e.g., 7-day sum) & holiday/seasonality flags.

### `_build_feature_matrix(menu_item_id, lookback_days=90)` ✅

Constructs enriched daily sales DataFrame with: previous forecast quantity, previous error, weather features (temp/precip lags & rolling avg), lag_1, lag_7, and several derived error stats.
Risks:

- Feature leakage potential if previous forecasted quantity includes future-looking adjustments; verify temporal integrity.
- Weather inclusion threshold `MIN_EXOG_DAYS=30` may exclude partly-known weather; consider imputation.
  Suggestions: Add `holiday_flag`, `is_weekend`, `rolling_sales_7`, `rolling_sales_28`, `trend` (linear regression slope).

### `ensure_weather_for_range(start_date,end_date,concurrency=4)` ✅

Fetch missing weather rows concurrently using semaphore; upserts and commits per row. Good parallelization.
Risks:

- Per-date commit potentially slow; batch commit at end could optimize throughput.
- No retry or fallback strategy for API failures.
  Suggestions: Add exponential backoff, track missing unresolved dates for re-attempt later.

---

## 4. Forecast Generation & Persistence

### `generate_forecast(menu_item_id, horizon_days=14)` ✅

Logic: Attempt model-based prediction; if unavailable or error, fallback to blended weekday mean & last 14-day average.
Features for model inference: calendar vars + future weather lags constructed from past + predicted future weather sequence. Converts negative predictions to zero.
Risks:

- Assumes stable relationship between features and quantity; no uncertainty interval returned.
- Weather future forecast retrieval uses external integration; missing data leads to simplistic lag propagation.
  Suggestions: Add confidence interval (e.g., quantile predictions or std dev of residuals), incorporate seasonality (month-of-year) smoothing.

### `write_forecast_results(menu_item_id, forecast_data, confidence_score)` ✅

Persists forecast header and breakdown rows; version increments if existing period found. Rounds predicted quantities to integers. Handles transaction or standalone commit.
Risks:

- No dedup for overlapping forecast periods with partial horizon overlaps.
- Confidence score may reflect mixed metrics (e.g., both high MAPE and moderate R²) without threshold gating.
  Suggestions: Add `original_quantity_sum` vs `adjusted_quantity` difference tracking and store forecast generation strategy (`model` vs `fallback`).

---

## 5. Data Preparation Utility

### `_prepare_sales_dataframe(sales_history)` ✅

Aggregates raw sales rows into daily frequency time series frame. Risk: Fills missing days with zeros (could misrepresent demand volatility). Suggest adding a flag for explicit missing vs zero.

---

## 6. Breakdown & Demand Expansion

### `generate_batch_recipe_breakdown(forecast_breakdown)` ✅

Expands menu item forecasts through recipe → batch ingredients (ingredient_type=='batch'). Accumulates required batch recipe counts per date.
Risks: Multiple menu item recipes could duplicate batch usage; currently additive (likely desired). Suggest verifying yield unit consistency.

### `generate_ingredient_breakdown(forecast_breakdown, batch_recipe_breakdown)` ✅

Produces per-date ingredient consumption across menu item path and batch recipe path with unit normalization attempts. Builds list of dict entries.
Risks:

- Unit conversion fallback broad (catches ValueError only); may silently propagate mismatched units.
- Duplicate ingredient entries aggregated only after building `ingredient_map`; OK but ensure high performance for large menu sets.
  Suggestions: Cache recipe ingredient lookups; prefetch once per day.

### `generate_batch_prep_suggestions(forecast_breakdown=None, horizon_days=7)` ✅

Uses stored latest forecasts if none provided; filters batch breakdown to horizon window. Returns list of suggestions.
Risks: No threshold for minimal required quantity—could suggest tiny preps. Suggest adding a minimum threshold or Pareto rule.

### `aggregate_ingredient_demand_for_reorder(forecast_breakdown, days)` ✅

Aggregates ingredient usage across horizon window; builds dict keyed by ingredient_id with total quantity + daily breakdown.
Risks: Lacks unit conversion consistency across forecast source paths (but earlier conversion logic used). Suggest verifying unit alignment before reorder consumption.

### `log_forecast_metadata(forecast_version, used_in_order_generation)` ✅

Simple debug utility; does not persist metadata. Suggest persistent logging to a forecast metadata table.

### `run_forecasting_pipeline(forecast_date=None, horizon_days=30, reorder_horizon_days=30, threshold_mape=0.20, threshold_r2=0.70)` ✅

Full orchestrator:
Flow:

1. Validate sales existence; alert if missing.
2. Evaluate historical & daily forecast accuracy.
3. Get active menu items.
4. For each: decide retrain vs reuse; train model if needed; compute metrics; generate forecast (model or fallback); derive confidence; persist results.
5. Generate batch breakdown, flatten forecast dict into list, derive ingredient breakdown, aggregate ingredient demand for reorder horizon.
6. Populate internal caches and return aggregated ingredient demand.
   Risks:

- Retrain decision uses point-in-time thresholds only; no drift detection or schedule-based retrain.
- Generates and persists forecasts sequentially; potential speed issues with large menu counts.
- No global transaction; partial failure can leave some menu item forecasts persisted and others missing.
  Suggestions:
- Parallelize forecast generation using asyncio tasks with semaphore.
- Add try/except per item to collect errors and produce a partial success report.
- Persist pipeline run log (duration, items forecasted, items failed, average MAPE).

---

## 7. Fallback Usage Derivation

### `derive_ingredient_usage_from_sales(days=30)` ✅

Creates pseudo-forecast breakdown from historical sales, then calls batch + ingredient breakdown logic to derive per-ingredient usage map keyed by ingredient_id and date.
Use Case: InventoryStatsService fallback for sparse inventory usage logs.
Risks: Sales timestamp granularity—`sale.sale_timestamp` used directly as dict key; if contains datetime not normalized to date, duplication arises. Suggest normalizing to date first.

---

## 8. Helper Conversion

### `convert_forecast_dict_to_list(forecast_dict)` ✅

Flattens menu-item forecast dict → list of (menu_item_id, forecast_date, predicted_quantity) entries.
Risks: Assumes `daily_breakdown` format stable; safe.

---

## 9. Function Dependency Graph (Simplified)

```
run_forecasting_pipeline
  ├─ evaluate_and_record_accuracy
  ├─ evaluate_and_record_daily_forecast_accuracy
  ├─ should_retrain_model
  │    └─ _compute_forecast_accuracy_metrics
  ├─ train_menu_item_model (conditional)
  │    └─ _build_feature_matrix
  │         └─ ensure_weather_for_range (conditional)
  ├─ generate_forecast
  │    └─ (load_model / weather forecast integration / fallback logic)
  ├─ write_forecast_results
  ├─ generate_batch_recipe_breakdown
  ├─ convert_forecast_dict_to_list
  ├─ generate_ingredient_breakdown
  │    └─ convert_unit / normalize_unit
  ├─ aggregate_ingredient_demand_for_reorder
  └─ _derive_confidence_score
```

---

## 10. Completion & Risk Summary

| Area                    | Status | Key Risks                                                                   |
| ----------------------- | ------ | --------------------------------------------------------------------------- |
| Accuracy daily & period | ✅     | MAPE handling with zero actuals; missing bias metrics.                      |
| Retrain logic           | ✅     | Threshold-only; no time-based guard; may thrash models.                     |
| Feature engineering     | ✅     | Limited exogenous features; no holiday/seasonality flags.                   |
| Weather enrichment      | ✅     | Per-day commit overhead; missing retry/backoff.                             |
| Forecast inference      | ✅     | No uncertainty interval; fallback blend may overweight short-term noise.    |
| Persistence/versioning  | ✅     | No global metadata table; no cleanup of old versions.                       |
| Breakdown expansion     | ✅     | Potential performance overhead (per-menu-item recipe lookups).              |
| Aggregation for reorder | ✅     | Unit normalization complexity; assumes consistent units.                    |
| Confidence scoring      | ✅     | Equal weighting; could misrepresent reliability when sample size small.     |
| Pipeline orchestration  | ✅     | Sequential menu item processing; partial failure leaves inconsistent state. |

---

## 11. Improvement Roadmap

Priority tiers: P0 Critical | P1 Important | P2 Enhancement | P3 Refinement

| Priority | Item                                 | Description                                                                                         |
| -------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| P0       | Add pipeline run audit table         | Track run timestamp, duration, total items, failures, avg metrics.                                  |
| P0       | Add idempotency (per forecast_date)  | Skip regenerating if unchanged unless forced.                                                       |
| P1       | Parallelize menu-item forecast tasks | Use asyncio gather with semaphore for scalability.                                                  |
| P1       | Introduce drift detection            | Compare rolling MAPE vs historical baseline; trigger retrain.                                       |
| P1       | Improve zero-actual MAPE handling    | Replace None with neutral or exclude those days.                                                    |
| P1       | Add forecast strategy field          | Mark fallback vs model-driven forecasts in DB.                                                      |
| P2       | Expand features                      | Holiday flags, weekend flag, rolling 7/28 sales, temperature anomalies, event calendar integration. |
| P2       | Confidence weighting                 | Use inverse error variance or incorporate RMSE to weight.                                           |
| P2       | Weather fetch resiliency             | Add retry with exponential backoff; aggregate commit.                                               |
| P2       | Uncertainty intervals                | Bootstrap residuals or quantile regression for P10/P90.                                             |
| P3       | Model tuning                         | Hyperparameter grid search or AutoML fallback when data volume higher.                              |
| P3       | Historical version cleanup           | Archive or prune old forecast versions beyond retention window.                                     |
| P3       | Batch & ingredient caching layer     | Prefetch and memoize recipe ingredient structures across pipeline run.                              |

---

## 12. TL;DR

`ForecastingEngine` is fully operational: trains models, generates forecasts with weather and lag features, persists versions, computes daily and period accuracy, and breaks forecasts down into batch recipes and ingredient demand. Biggest gaps now are operational robustness (parallelization, audit logging, drift detection) and feature richness (holidays, extended weather, uncertainty). Solid foundation—ready for iterative refinement rather than structural overhaul.

---

_Generated for deep operational clarity—use as guide for ML and pipeline optimization sprints._
