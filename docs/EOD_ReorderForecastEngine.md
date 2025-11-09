# ReorderForecastEngine Detailed Inventory & Execution Analysis

> File: `app/services/reorder_forecast_engine.py`
> Tier: Master (invoked post-forecast to drive reorder suggestions)
> Purpose: Translate forecasted ingredient demand and historical usage variability into actionable reorder quantities with safety stock and ABC prioritization.
>
> Legend: Status — ✅ Complete | ⚠ Partial | ❌ Missing | 🔄 Suggestion

---

## 1. Initialization

### `__init__(db, restaurant_id, subscription_tier=None)` ✅

Dependencies wired:

- `IngredientRepository` – ingredient metadata & ABC class storage.
- `InventoryStatsService` – usage stats (avg, std dev), on-hand, lead time, MOQ, shelf life, max stock.
- `AlertRepository` – low stock / classification change alerts.

Cache: `_abc_cache` for fast repeated classification retrieval.

Risks: None critical. Could add lazy evaluation for stats when many ingredients.

---

## 2. Safety & Demand Core

### `calculate_safety_stock(ingredient_id, lead_time)` ✅

Formula: Z (1.65) × σ_usage × √(lead_time). Rounds to 0.01. Assumes daily usage independence and stable variance.

Risks: Lead time uncertainty ignored; demand variance over lead window treated as linear. 🔄 Add composite variance term if lead time fluctuates.

### `calculate_reorder_point(ingredient_id)` ✅

Reorder Point = AvgDailyUsage × LeadTime + SafetyStock. Calls stats service for usage & lead time.

Risks: Seasonal spikes not captured; average smoothing may under-protect near holidays/events.

🔄 Suggest adding recent trend or forecasted near-term uplift adjustment.

### `calculate_max_order(ingredient_id, current_stock)` ✅

Returns headroom (max_stock − current_stock) floored at zero. If no max stock defined returns Decimal("Infinity").

Risks: Using string-like Infinity invites numeric pitfalls downstream.

🔄 Replace with `None` to signal unbounded; handle explicitly when capping order quantity.

### `suggest_reorder_quantity(...)` ✅

Inputs: lead_demand, shelf_demand, total_demand (passed but not directly used except components), unit (unused in logic), lead_time.

Flow:

1. ABC classification.
2. Current stock, safety stock, MOQ.
3. Compute reorder_point = lead_demand + safety_stock. If current ≥ reorder_point → no order.
4. Low stock alert if ordering needed.
5. Reorder target = lead + shelf + safety; raw = target − current.
6. ABC scaling: A uses raw or MOQ; B adds 10%; C adds 50% & doubles MOQ floor.
7. Cap by max order headroom.
8. Clamp ≥0 and round.

Risks:

- Ignores forecast confidence; may over-order on uncertain predictions.
- Unit parameter unused; caller must ensure consistent unit domain pre-call.
- High ABC scaling for C could inflate slow movers, increasing dead stock.

🔄 Add confidence scaling (e.g., multiply raw by confidence or apply tiered discount).

🔄 Parameterize ABC multipliers per business rules.

---

## 3. Classification & Bulk Operations

### `classify_abc_item(ingredient_id)` ✅

Fast path: check cache else read ingredient. Defaults to "C" if undefined.

Risk: Stale if bulk reclassification not run. Acceptable within single EOD cycle.

### `classify_all_ingredients(days=90)` ✅

Computes consumption value (usage × unit_cost) over window; cumulative percentile assignment: A ≤70%, B ≤90%, else C.

Writes only changed classifications to DB.

Risks:

- N+1 usage fetch calls → performance issues for large ingredient sets.
- Hard-coded 70/20/10 thresholds may not reflect margin/criticality.

🔄 Introduce bulk usage retrieval or pre-aggregation query.

🔄 Allow dynamic threshold configuration (env or settings table).

### `create_low_stock_alert(ingredient_id, current_stock, reorder_point)` ✅

Simple alert insertion. No dedup.

Risks: Alert spam for persistent low stock across days.

🔄 Add uniqueness constraint (ingredient_id + date) or cooldown logic.

---

## 4. Dependency Graph

```
suggest_reorder_quantity
  ├─ classify_abc_item
  ├─ stats_service.get_current_inventory
  ├─ calculate_safety_stock
  │   └─ stats_service.get_std_dev_usage
  ├─ stats_service.get_moq
  ├─ calculate_max_order
  │   └─ stats_service.get_max_stock_level
  └─ create_low_stock_alert (conditional)

calculate_reorder_point
  ├─ stats_service.get_lead_time_days
  ├─ stats_service.get_average_daily_usage
  └─ calculate_safety_stock

classify_all_ingredients
  └─ stats_service.get_total_usage_last_n_days
```

---

## 5. Completion & Risk Summary

| Area                         | Status | Key Risks                                         |
| ---------------------------- | ------ | ------------------------------------------------- |
| Safety stock & reorder point | ✅     | Demand seasonality & lead time variance ignored.  |
| Suggested reorder quantity   | ✅     | No confidence integration; unit parameter unused. |
| ABC single classification    | ✅     | Possible staleness across days.                   |
| ABC bulk classification      | ✅     | Performance for large ingredient counts (N+1).    |
| Alerts                       | ✅     | Duplicate spam potential; no severity or meta.    |

---

## 6. Improvement Roadmap

| Priority | Item                              | Description                                                                  |
| -------- | --------------------------------- | ---------------------------------------------------------------------------- |
| P0       | Replace Decimal("Infinity")       | Return None for uncapped inventory; adjust min() logic accordingly.          |
| P0       | Confidence-aware ordering         | Scale raw order by forecast confidence bands (e.g., <0.4 → ×0.7).            |
| P1       | Alert deduplication               | Enforce one LowStock alert per ingredient per day.                           |
| P1       | Parameterize ABC multipliers      | Externalize scaling & service levels (A/B/C).                                |
| P2       | Bulk usage fetch for classify_all | Single query to compute consumption values.                                  |
| P2       | Dynamic service level Z           | A:1.96, B:1.65, C:1.28 (or configurable).                                    |
| P2       | Shelf-life alignment              | Include shelf life demand vs reorder horizon directly in safety stock logic. |
| P3       | Economic order quantity (EOQ)     | Add cost optimization when max stock unbounded.                              |
| P3       | Variability modeling              | Use moving std dev windows or forecast residual variance.                    |

---

## 7. TL;DR

The reorder engine is functionally solid: it produces sensible conservative quantities using ABC + safety stock. Biggest uplift now is integrating confidence and replacing hard-coded scaling with configurable parameters—plus cleaning up Infinity and avoiding repetitive alerts.

---

_Regenerated after accidental deletion — ready for procurement optimization planning._

# ReorderForecastEngine Detailed Inventory & Execution Analysis

> File: `app/services/reorder_forecast_engine.py`
> Tier: Master (invoked post-forecast to drive reorder suggestions)
> Purpose: Translate forecasted ingredient demand and historical usage variability into actionable reorder quantities with safety stock and ABC prioritization.
>
> Legend: Status — ✅ Complete | ⚠ Partial | ❌ Missing | 🔄 Suggestion

---

## 1. Initialization

### `__init__(db, restaurant_id, subscription_tier=None)` ✅

Dependencies wired:

- `IngredientRepository` – ingredient metadata & ABC class storage.
- `InventoryStatsService` – usage stats (avg, std dev), on-hand, lead time, MOQ, shelf life, max stock.
- `AlertRepository` – low stock / classification change alerts.
  Cache: `_abc_cache` for fast repeated classification retrieval.
  Risks: None critical. Could add lazy evaluation for stats when many ingredients.

---

## 2. Safety & Demand Core

### `calculate_safety_stock(ingredient_id, lead_time)` ✅

Formula: Z (1.65) × σ_usage × √(lead_time). Rounds to 0.01. Assumes daily usage independence and stable variance.
Risks: Lead time uncertainty ignored; demand variance over lead window treated as linear. 🔄 Add composite variance term if lead time fluctuates.

### `calculate_reorder_point(ingredient_id)` ✅

Reorder Point = AvgDailyUsage × LeadTime + SafetyStock. Calls stats service for usage & lead time.
Risks: Seasonal spikes not captured; average smoothing may under-protect near holidays/events.
🔄 Suggest adding recent trend or forecasted near-term uplift adjustment.

### `calculate_max_order(ingredient_id, current_stock)` ✅

Returns headroom (max_stock − current_stock) floored at zero. If no max stock defined returns Decimal("Infinity").
Risks: Using string-like Infinity invites numeric pitfalls downstream.
🔄 Replace with `None` to signal unbounded; handle explicitly when capping order quantity.

### `suggest_reorder_quantity(...)` ✅

Inputs: lead_demand, shelf_demand, total_demand (passed but not directly used except components), unit (unused in logic), lead_time.
Flow:

1. ABC classification.
2. Current stock, safety stock, MOQ.
3. Compute reorder_point = lead_demand + safety_stock. If current ≥ reorder_point → no order.
4. Low stock alert if ordering needed.
5. Reorder target = lead + shelf + safety; raw = target − current.
6. ABC scaling: A uses raw or MOQ; B adds 10%; C adds 50% & doubles MOQ floor.
7. Cap by max order headroom.
8. Clamp ≥0 and round.
   Risks:

- Ignores forecast confidence; may over-order on uncertain predictions.
- Unit parameter unused; caller must ensure consistent unit domain pre-call.
- High ABC scaling for C could inflate slow movers, increasing dead stock.
  🔄 Add confidence scaling (e.g., multiply raw by confidence or apply tiered discount).
  🔄 Parameterize ABC multipliers per business rules.

---

## 3. Classification & Bulk Operations

### `classify_abc_item(ingredient_id)` ✅

Fast path: check cache else read ingredient. Defaults to "C" if undefined.
Risk: Stale if bulk reclassification not run. Acceptable within single EOD cycle.

### `classify_all_ingredients(days=90)` ✅

Computes consumption value (usage × unit_cost) over window; cumulative percentile assignment: A ≤70%, B ≤90%, else C.
Writes only changed classifications to DB.
Risks:

- N+1 usage fetch calls → performance issues for large ingredient sets.
- Hard-coded 70/20/10 thresholds may not reflect margin/criticality.
  🔄 Introduce bulk usage retrieval or pre-aggregation query.
  🔄 Allow dynamic threshold configuration (env or settings table).

### `create_low_stock_alert(ingredient_id, current_stock, reorder_point)` ✅

Simple alert insertion. No dedup.
Risks: Alert spam for persistent low stock across days.
🔄 Add uniqueness constraint (ingredient_id + date) or cooldown logic.

---

## 4. Dependency Graph

```
suggest_reorder_quantity
  ├─ classify_abc_item
  ├─ stats_service.get_current_inventory
  ├─ calculate_safety_stock
  │   └─ stats_service.get_std_dev_usage
  ├─ stats_service.get_moq
  ├─ calculate_max_order
  │   └─ stats_service.get_max_stock_level
  └─ create_low_stock_alert (conditional)

calculate_reorder_point
  ├─ stats_service.get_lead_time_days
  ├─ stats_service.get_average_daily_usage
  └─ calculate_safety_stock

classify_all_ingredients
  └─ stats_service.get_total_usage_last_n_days
```

---

## 5. Completion & Risk Summary

| Area                         | Status | Key Risks                                         |
| ---------------------------- | ------ | ------------------------------------------------- |
| Safety stock & reorder point | ✅     | Demand seasonality & lead time variance ignored.  |
| Suggested reorder quantity   | ✅     | No confidence integration; unit parameter unused. |
| ABC single classification    | ✅     | Possible staleness across days.                   |
| ABC bulk classification      | ✅     | Performance for large ingredient counts (N+1).    |
| Alerts                       | ✅     | Duplicate spam potential; no severity or meta.    |

---

## 6. Improvement Roadmap

| Priority | Item                              | Description                                                                  |
| -------- | --------------------------------- | ---------------------------------------------------------------------------- |
| P0       | Replace Decimal("Infinity")       | Return None for uncapped inventory; adjust min() logic accordingly.          |
| P0       | Confidence-aware ordering         | Scale raw order by forecast confidence bands (e.g., <0.4 → ×0.7).            |
| P1       | Alert deduplication               | Enforce one LowStock alert per ingredient per day.                           |
| P1       | Parameterize ABC multipliers      | Externalize scaling & service levels (A/B/C).                                |
| P2       | Bulk usage fetch for classify_all | Single query to compute consumption values.                                  |
| P2       | Dynamic service level Z           | A:1.96, B:1.65, C:1.28 (or configurable).                                    |
| P2       | Shelf-life alignment              | Include shelf life demand vs reorder horizon directly in safety stock logic. |
| P3       | Economic order quantity (EOQ)     | Add cost optimization when max stock unbounded.                              |
| P3       | Variability modeling              | Use moving std dev windows or forecast residual variance.                    |

---

## 7. TL;DR

The reorder engine is functionally solid: it produces sensible conservative quantities using ABC + safety stock. Biggest uplift now is integrating confidence and replacing hard-coded scaling with configurable parameters—plus cleaning up Infinity and avoiding repetitive alerts.

---

_Regenerated after accidental deletion — ready for procurement optimization planning._
