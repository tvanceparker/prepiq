# InventoryStatsService Detailed Inventory & Execution Analysis

> File: `app/services/inventory_stats_service.py`
> Tier: Master (supporting ReorderForecastEngine and EOD orchestration)
> Purpose: Provide reliable inventory- and supplier-derived statistics (usage, variability, stock, lead time, MOQ, shelf life, caps) with sensible sales-derived fallbacks when logs are sparse.
>
> Legend: Status — ✅ Complete | ⚠ Partial | ❌ Missing | 🔄 Suggestion

---

## 1. Initialization

### `__init__(db, restaurant_id, subscription_tier=None)` ✅

Dependencies wired:

- `InventoryRepository` – current on-hand and unit by ingredient.
- `InventoryLotRepository` – present but not used in this service (reserved for future FIFO/lot-aware stats).
- `InventoryUsageLogRepository` – daily usage time series from inventory log deductions.
- `IngredientRepository` – ingredient master data (max stock, shelf life, etc.).
- `IngredientSupplierRepository` – supplier attributes (lead time, MOQ, pack sizes if present).
- `ForecastingEngine` – used to derive sales-based ingredient usage when usage logs are sparse.

Notes:

- Service is tenant-scoped via `restaurant_id`.
- Prints debug lines; consider unifying with the shared logging decorators.

---

## 2. Usage Statistics

### `get_average_daily_usage(ingredient_id, days=30) -> Decimal` ✅

Behavior:

- Pulls daily usage via `InventoryUsageLogRepository.get_daily_usage`.
- If at least 14 samples exist, uses those values.
- Otherwise, falls back to `ForecastingEngine.derive_ingredient_usage_from_sales(days)` and extracts the ingredient’s per-day totals.
- Returns mean rounded to 0.01.

Risks / Notes:

- Hard-coded threshold (14) may not fit all tenants. 🔄 Make configurable (env or DB setting).
- Fallback relies on sales-to-ingredient mapping parity with log units. 🔄 Validate units/convert to canonical ingredient UOM.
- Mean is unweighted; recent trends aren’t emphasized. 🔄 Offer moving average or exponential smoothing option.

### `get_std_dev_usage(ingredient_id, days=30) -> Decimal` ✅

Behavior:

- Same data selection logic as average; computes population standard deviation (`statistics.pstdev`).
- Requires at least 2 samples; otherwise returns 0.00.

Risks / Notes:

- Population σ may understate uncertainty on small samples. 🔄 Consider sample stdev (`statistics.stdev`) for n < ~30.
- Daily independence is assumed; seasonality not separated. 🔄 Alternative: compute std on deseasonalized residuals from ForecastingEngine.

### `get_total_usage_last_n_days(ingredient_id, days=90) -> Decimal` ✅

Behavior:

- Sums usage over the window from logs; if none found, falls back to sales-derived usage via ForecastingEngine.
- Returns total rounded to 0.01.

Risks / Notes:

- Fallback can be expensive if called per-ingredient in large loops. 🔄 Add simple memoization per (days) window or a bulk variant.

---

## 3. Stock Levels & Attributes

### `get_current_inventory(ingredient_id) -> tuple[Decimal, str]` ✅

Behavior:

- Returns `(quantity_on_hand, unit)` from `InventoryRepository`.
- If no record, returns `(0.00, "")`.

Risks / Notes:

- Lots are not considered here. Acceptable for stats; lot-aware logic belongs in deduction/expiry modules.

### `get_lead_time_days(ingredient_id) -> int` ✅

Behavior:

- Fetches preferred or lowest-priority supplier and returns `lead_time_days`.
- Defaults to 1 day if not defined.

Risks / Notes:

- Supplier selection heuristic may differ from purchasing logic. 🔄 Align with PO creation rules (prefer “preferred” strictly, then fallback).

### `get_moq(ingredient_id) -> Decimal` ✅

Behavior:

- Returns supplier `min_order_quantity` or 1 if undefined.

Risks / Notes:

- Units and pack conversions are not handled here. 🔄 Ensure caller (reorder engine) interprets MOQ in the same unit.

### `get_max_stock_level(ingredient_id) -> Optional[Decimal]` ✅

Behavior:

- Returns `ingredient.max_stock_level` if set; otherwise `None`.

Risks / Notes:

- Max stock semantics (absolute vs. per-pack) are assumed absolute in canonical units. 🔄 Document/normalize if packs apply.

### `get_shelf_life_days(ingredient_id) -> int` ✅

Behavior:

- Returns `ingredient.shelf_life_days` or default 30.

Risks / Notes:

- Defaults may be too generous for perishable categories. 🔄 Consider category-level defaults.

---

## 4. Dependency Graph

```
get_average_daily_usage
  ├─ inventory_usage_log_repo.get_daily_usage
  └─ forecasting_engine.derive_ingredient_usage_from_sales (fallback)

get_std_dev_usage
  ├─ inventory_usage_log_repo.get_daily_usage
  └─ forecasting_engine.derive_ingredient_usage_from_sales (fallback)

get_total_usage_last_n_days
  ├─ inventory_usage_log_repo.get_daily_usage
  └─ forecasting_engine.derive_ingredient_usage_from_sales (fallback)

get_current_inventory
  └─ inventory_repo.get_inventory_by_ingredient

get_lead_time_days
  └─ ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier

get_moq
  └─ ingredient_supplier_repo.get_preferred_or_lowest_priority_supplier

get_max_stock_level
  └─ ingredient_repo.get_by_id

get_shelf_life_days
  └─ ingredient_repo.get_by_id
```

---

## 5. Completion & Risk Summary

| Area                          | Status | Key Risks                                                            |
| ----------------------------- | ------ | -------------------------------------------------------------------- |
| Average daily usage           | ✅     | Threshold hard-coded; unit alignment for sales fallback.             |
| Usage standard deviation      | ✅     | Population σ on small n; seasonality not separated.                  |
| Total usage (window)          | ✅     | Potential repeated fallback cost across many ingredients.            |
| Current inventory (qty, unit) | ✅     | Lot/expiry nuances not included (by design for stats).               |
| Lead time                     | ✅     | Supplier selection policy may diverge from purchasing logic.         |
| MOQ                           | ✅     | Pack/unit conversions out-of-scope; caller must interpret correctly. |
| Max stock level               | ✅     | Semantics must match reorder caps.                                   |
| Shelf life                    | ✅     | Default 30 may be misaligned for perishables.                        |

---

## 6. Improvement Roadmap

| Priority | Item                                | Description                                                                                |
| -------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| P0       | Configurable usage thresholds       | Externalize the 14-sample threshold; allow per-tenant tuning.                              |
| P0       | Memoize sales-derived fallbacks     | Cache results of `derive_ingredient_usage_from_sales(days)` during a request/EOD run.      |
| P1       | Unit normalization checks           | Assert/convert units between logs and sales-derived usage to canonical ingredient UOM.     |
| P1       | Logging consistency                 | Replace prints with `@log_method` + central logger for structured telemetry.               |
| P2       | Sample vs. population σ             | Use sample stdev for small n, or switch based on a configurable cutoff.                    |
| P2       | Trend-aware averages                | Offer EMA or recent-window weighting to reflect current demand shifts.                     |
| P2       | Supplier selection policy alignment | Expose a strict “preferred-then-fallback” mode to mirror PO creation rules.                |
| P3       | Bulk API variants                   | Provide bulk `get_*` methods to reduce N+1 patterns in callers (e.g., ABC classification). |

---

## 7. TL;DR

InventoryStatsService is production-ready for Master EOD: it supplies reliable averages, variability, and supplier constraints with pragmatic sales-based fallbacks. The biggest wins now are caching sales fallbacks, making thresholds configurable, aligning units/policies, and swapping prints for structured logs.
