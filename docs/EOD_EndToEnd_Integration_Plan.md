# Master End‑to‑End EOD Pipeline Integration (Forecasting → Inventory → Reorder → PO)

> Scope: `EODService`, `ForecastingEngine`, `InventoryStatsService`, `ReorderForecastEngine`
> Goal: One coherent, reliable, extensible nightly (or intra-day) pipeline producing accurate forecasts, defensible reorder quantities, and high-signal operational alerts.

---

## 1. High-Level Flow (Execution Ladder)

1. Acquire sales + contextual data (POS, weather, menu metadata).
2. Run advanced forecasting pipeline (menu-item horizon → breakdown → ingredient aggregation).
3. Evaluate & persist forecast accuracy (daily + rolling) and derive confidence scores.
4. Derive inventory usage stats (avg, variance, lead time, MOQ, shelf life, max stock).
5. Compute reorder recommendations (safety stock + reorder point + demand horizon).
6. Generate purchase order suggestions (supplier selection, pack conversions, cost calc).
7. Persist orders & alerts (low stock, anomalies, model degradation) and prepare batch prep schedule.
8. Idempotent finalize (mark run, commit segmented transactions, emit summary telemetry).

---

## 2. Component Contracts (Mini-Interface Specs)

### ForecastingEngine
- Input: `restaurant_id`, lookback sales, recipe graphs, weather data.
- Output: `ingredient_forecast: Dict[int,{unit,str,daily_breakdown:List[(date,qty)]}]`, accuracy metrics, confidence scores.
- Error Modes: Missing sales (graceful fallback), weather gaps (retry/enrich), model underperforming (retrain trigger).
- Success Criteria: Latest forecast version persisted; accuracy records up-to-date; breakdown caches populated.

### InventoryStatsService
- Input: `ingredient_id`, usage logs, supplier + ingredient metadata.
- Output: Avg daily usage, std dev, current stock, lead time, MOQ, max stock, shelf life, total usage window.
- Error Modes: Sparse logs (fallback to sales mapping), missing supplier (defaults), missing ingredient (neutral zeros).
- Success Criteria: Provides consistent numeric baselines to reorder logic in canonical units.

### ReorderForecastEngine
- Input: Ingredient forecast (lead + shelf windows), usage stats, ABC class (current), service level Z.
- Output: Recommended reorder quantity per ingredient, optional low-stock alerts.
- Error Modes: No max stock (treat unlimited), insufficient data (safety stock degenerates to ~0), supplier constraints (MOQ inflation).
- Success Criteria: Quantities never negative, scaled by risk tier, obey MOQ and max caps.

### EODService
- Input: Target date, horizon settings, subscription tier.
- Output: Deducted inventory logs, forecasts (via FE), purchase order suggestions, persisted POs, summary counts.
- Error Modes: Missing sales (skip deduction), forecast failure (degrade gracefully), PO write failure (retry or isolate stage).
- Success Criteria: Each stage commits atomically; run is idempotent; summary returned with counts & durations.

---

## 3. Current Strengths (What’s “Perfect” or Close)

| Area | Strength |
|------|----------|
| Forecast breakdown | Detailed multi-tier decomposition (menu → batch → ingredient) enabling multi-purpose reuse. |
| Accuracy tracking | Daily + rolling metrics foundation with confidence scoring scaffold. |
| Fallback strategy | Sales-derived usage mapping prevents data sparsity stalls for stats service. |
| Reorder logic base | Classical safety stock + reorder point pattern modularized. |
| Supplier integration | PO suggestion pipeline considers lead time, pack size, MOQ, shelf life horizon. |
| Tenant isolation | All repositories/service constructors scoped by `restaurant_id`. |
| Modularity | Separation into dedicated services encourages targeted enhancement without cross-coupled changes. |
| Logging decor pattern | `@log_method` available to unify telemetry (not yet applied everywhere). |

---

## 4. Gaps & Imperfections (The “Change End-to-End” List)

| Gap | Impact | Proposed Change | Priority |
|-----|--------|-----------------|----------|
| Non-idempotent EOD finalize | Risk of double deductions / duplicate POs on reruns | Add run ledger row (date + restaurant_id) + stage flags; skip executed stages | P0 |
| Monolithic commit strategy | Large failure domain (rollback loses successful sub-work) | Segment transactions (deduct → commit, forecast → commit, reorder/PO → commit) | P0 |
| Legacy `evaluate_forecast_accuracy` in `EODService` | Calls non-existent FE API, redundant logic | Remove; delegate entirely to `ForecastingEngine.evaluate_and_record_*` | P0 |
| Prints over structured logging in stats/reorder services | Inconsistent observability | Replace with central logger + `@log_method` | P0 |
| ABC classification static thresholds (70/90) | May misalign with margin/criticality | Parameterize thresholds or adopt weighted inventory value + service differentiation | P1 |
| Safety stock single Z (1.65) | Undifferentiated risk across ABC tiers | Dynamic Z (A:1.96, B:1.65, C:1.28) or confidence-adjusted Z | P1 |
| Confidence not used in reorder qty | Over/under ordering when forecast uncertainty high | Scale reorder target by confidence or widen safety stock with low confidence | P1 |
| `Decimal("Infinity")` sentinel | Potential numeric mishandling downstream | Return `None` for unbounded; handle explicitly | P1 |
| Forecast pipeline potential single-thread weather fetch | Longer runtime in adverse latency | Concurrency controls & retry/backoff with circuit breaker | P2 |
| Usage log vs sales unit normalization | Silent unit drift possible | Canonical unit enforcement + conversion layer (inventory unit registry) | P2 |
| Lack of bulk stats APIs | N+1 queries for ABC classification & reorder passes | Introduce batch getter methods (usage, std dev, inventory) | P2 |
| Alert spam (low stock) | Noise reduces operator trust | Dedup per ingredient per day + severity escalation thresholds | P2 |
| Shelf life default (30) | Overly generic for perishable categories | Category-based defaults + override table | P3 |
| No explicit anomaly detection | Miss unusual demand spikes early | Add residual z-score anomaly checks → alerts | P3 |
| No versioned PO generation metadata | Harder to audit changes | Stamp PO suggestions with forecast_version + confidence snapshot | P3 |

---

## 5. Rethinking ABC Classification (Alternatives & Enhancements)

ABC (value concentration) works but may be blunt. Potential upgrades:

| Approach | Description | Pros | Cons |
|----------|-------------|------|------|
| Service-Level Differentiation (Dynamic Z) | Map target service levels by criticality (e.g., menu contribution margin, spoil risk) → variable Z | Better risk alignment | Needs margin & spoilage metadata |
| FSN / Velocity Classification | Fast, Slow, Non-moving categories based on turnover frequency | Targets movement patterns | Needs lot movement tracking |
| Demand Variability Index | Rank by coefficient of variation (CV = σ/μ) to drive safety stock emphasis | Directly encodes uncertainty | Might overweight low-mean noisy items |
| Hybrid (Value × Variability) | Score = normalized consumption value × (1 + CV) → quantile partition | Balances value & unpredictability | Slightly more complex to explain |
| ML Prioritization | Train model predicting stockout cost; classify by predicted impact | Potential optimality | Data-hungry, higher complexity |

Recommended Path: Transition from pure ABC → Hybrid (Value × Variability). Keep existing ABC as fallback; introduce dynamic Z mapping tied to tiered risk buckets.

---

## 6. Unified Alert Strategy

| Alert Type | Trigger | Dedup Key | Severity Logic |
|------------|--------|-----------|---------------|
| LowStock | Current < reorder_point | (ingredient_id, date) | Severity escalates if stock < safety_stock, or consecutive days low |
| ModelDegrade | Confidence < threshold OR MAPE > target | (menu_item_id, forecast_version) | Escalate if two consecutive versions degrade |
| AnomalyDemand | Residual z-score > configured limit | (menu_item_id, date) | Increase severity with magnitude or repetition |
| ForecastDataGap | Missing weather / sales segment | (date, data_type) | Warn then error if consecutive days |

Implementation: Introduce `AlertRules` registry object injected into services; unify creation via `ForecastingEngine._raise_alert` wrapper.

---

## 7. Data Model Additions

| Table | New Columns | Purpose |
|-------|-------------|---------|
| `eod_run_ledger` | restaurant_id, run_date, stages JSON, durations, success flags | Idempotency & observability |
| `ingredients` | variability_score (nullable) | Hybrid classification support |
| `purchase_orders` | forecast_version, generation_confidence | Audit & traceability |
| `alerts` | meta.confidence, meta.mape, meta.r2 | Richer debugging context |
| `inventory_units` (new) | ingredient_id, base_unit, conversions JSON | Canonical unit enforcement |

---

## 8. Transaction & Idempotency Plan

Stage segmentation with ledger entries:

| Stage | Actions | Commit? | Ledger Flag |
|-------|---------|---------|-------------|
| `sales_deduction` | aggregate + deduct inventory + usage logs | Yes | `sales_deducted` |
| `forecast_generation` | run pipeline, persist results & accuracy | Yes | `forecast_completed` |
| `reorder_calc` | compute reorder qty + low stock alerts | Yes | `reorder_completed` |
| `po_suggestions` | build purchase orders in memory | No (until write) | `po_suggested` |
| `po_write` | persist POs + items | Yes | `po_written` |
| `summary_finalize` | write metrics + mark completed | Yes | `finalized` |

On rerun: read ledger → skip completed stages; verify no duplicate POs by checking `po_written` + matching forecast_version.

---

## 9. Confidence Integration in Reorder Logic

Formula augmentation:

```
confidence ∈ [0,1]
adjusted_safety = base_safety * (1 + (1 - confidence))  # inflate when low confidence
adjusted_target = (lead_demand + shelf_demand) * (0.7 + 0.3 * confidence)  # dampen low confidence
reorder_point = lead_demand + adjusted_safety
suggested = max(adjusted_target + adjusted_safety - current_stock, 0)
```

Then apply MOQ & max cap. For very low confidence (<0.3) optionally trigger an `ModelDegrade` alert to prompt investigation.

---

## 10. Performance Optimizations

| Area | Optimization |
|------|--------------|
| Usage stat fallbacks | Memoize sales-derived usage for duration of pipeline run (in-memory map keyed by days). |
| ABC/Hybrid classification | Bulk query usage & cost via grouped SQL + compute scores in Python once. |
| Weather enrichment | Async gather + concurrency limit; cache stable historic weather beyond lookback horizon. |
| Ingredient aggregation | Vectorize breakdown merging via pandas DataFrames instead of nested loops (optional). |
| Alert writes | Batch insert low stock alerts; dedup pre-insert. |
| PO computation | Pre-fetch all supplier + inventory records in one pass for all ingredients. |

---

## 11. Roadmap & Milestones

| Milestone | Deliverables | Priority |
|-----------|-------------|----------|
| M1 (Reliability Core) | Ledger table, segmented commits, remove legacy accuracy function, logging refactor | P0 |
| M2 (Confidence & Hybrid) | Confidence → reorder integration, hybrid classification, dynamic Z mapping | P1 |
| M3 (Data Integrity) | Unit normalization layer, bulk stats APIs, alert dedup logic | P2 |
| M4 (Operational Insight) | Enhanced alert meta, anomaly detection module, PO metadata versioning | P3 |
| M5 (Performance) | Memoization, bulk fetches, concurrency improvements | P3 |
| M6 (Advanced Optimization) | EOQ or cost optimization, reservoir sampling for retrain triggers | P4 |

---

## 12. Immediate Action Checklist (Sprint Candidate)

- [ ] Create `eod_run_ledger` table + service helper.
- [ ] Refactor `EODService.finalize_end_of_day_summary` to stage commits.
- [ ] Delete / replace `EODService.evaluate_forecast_accuracy` with FE calls.
- [ ] Swap prints in `InventoryStatsService` & `ReorderForecastEngine` for logger decorators.
- [ ] Change `Decimal("Infinity")` → `None` return & handle in reorder logic.
- [ ] Add confidence scaling hooks (read FE confidence map).
- [ ] Parameterize ABC thresholds & introduce hybrid scoring placeholder field.

---

## 13. TL;DR

The pipeline is structurally solid: advanced forecasting plus classical inventory/reorder logic already yields usable daily operational outputs. To become “one of a kind,” focus next on reliability (ledger + segmented commits), intelligence (confidence-aware + hybrid classification), data integrity (unit normalization, bulk stats), and clarity (structured logging + enriched alerts). These upgrades convert a good deterministic engine into a resilient, adaptive decision platform.
