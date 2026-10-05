# Food-waste pipeline audit and reorder walkthrough

Audited October 5, 2026. Baseline: `fd6486b09f9c7a961d249d2859c698f77222f70f`, branch `feature/mobile-fixes-may-2026`. This describes that checkout, not uninspected changes on other branches. Review covered EOD scheduling/orchestration, both forecast engines, inventory statistics, reorder helpers, prep, purchasing/receipts, cached forecast consumers, and their repositories/tests. No live database was exercised or changed.


The findings below are the historical audit that motivated #43–#57. They are not the current implementation description. The implementation now uses shared units, FEFO movements, net prep, dated inbound, constrained packs, tenant planning locks, frozen forecast snapshots and a calendar-only model feature contract. See [the current engine guide](reorder-engine-guide.md), [validation and release gates](launch-signoff.md), and [measured synthetic comparisons](reorder-benchmark-summary.md). No customer database was changed; the implementation was exercised against isolated SQLite and a disposable MariaDB database, with MySQL 8 CI coverage added.

## Baseline behavior before the fixes

The Full EOD sequence is actual sales deduction -> spoilage -> forecast/accuracy -> ingredient reorder decisions -> purchase-order carts -> finalize ledger. Basic uses its separate forecasting engine. Batch prep execution is separate; EOD does not generate a net prep plan.

Menu forecasting prefers an available H2O GBM. Without a usable model it chooses a weekday/recent-demand baseline or an intermittent expected-demand heuristic. The latter produces expected daily quantities; they are not confirmed future events. Forecast menu quantities expand through menu recipes into direct raw usage and prepared batch demand. Batch demand recursively expands into raw ingredient equivalents.

Sales consume raw recipe ingredients and prepared batch output. Producing a batch should consume its raw/child-batch inputs and create output. Gross theoretical ingredient consumption and net production/purchasing requirements need separate meanings.

## Reorder inputs and decision sequence

1. EOD/on-demand callers supply daily ingredient demand, unit, date, supplier option, shelf life, stock, and MOQ.
2. Missing ingredient policies may be inferred and persisted by `policy_bootstrap.py` using shelf life, names/categories, dependency links, and sparse demand. Manual settings are preserved. Defaults are fresh 90%, stable 95%, recipe 93%, intermittent 88% target service levels.
3. `context_builder.py` resolves supplier order/delivery weekdays, lead time, review interval and a protection window. Preferred suppliers form the first candidate pool; within that pool cadence-enabled selection prioritizes earliest delivery, then order date, then priority. Without cadence it uses supplier priority. It does not optimize price/pack waste against other suppliers.
4. `InventoryStatsService.get_usable_inventory` prepares lot balances and simulates forecast consumption in earliest-expiry order. It returns usable starting inventory (stock that can be consumed or survive the horizon), not just leftover stock after consumption. This distinction is intentional: subtracting forecast consumption again here would double subtract it in an order-up-to calculation.
5. Inventory position is usable stock + inbound - backorders. Currently inbound and backorders are hardcoded zero.
6. One of four policy methods sets trigger, target, raw quantity and reserve.
7. Shared stock-position/capacity limits and MOQ handling produce `final_quantity` and `should_reorder`. Low-stock alerts are updated.
8. Caller converts to supplier units, rounds up to integer packs, builds explanations and creates carts. Final pack quantities are not fully revalidated against limits.

## Exact policy behavior

Notation: `I` = inventory position; `L` = effective days until delivery; `P` = uncapped protection window; `D(w)` = forecast demand in the chosen w-day window; `sigma` = historical usage standard deviation; `z` = configured normal service-level score. Quantities are repeatedly rounded to two decimal places.

| Policy | Target/trigger before shared caps | Buffer |
| --- | --- | --- |
| stable_stocked | Trigger when `I <= D(L) + S`; target `D(P) + S`; raw order is target minus I when triggered | `S = z * sigma * sqrt(L)` |
| fresh_perishable | Window W = min(shelf life, protection window); target `D(W) + R`; raw order = max(target - I, 0), then spoilage cap | `R = min(D(W)/W, D(W))`; spoilage cap uses shelf-life demand times `1 + max(0.10 - supplier spoilage_rate, 0)` |
| recipe_dependent | Target = protection demand + recipe guard; raw order = max(target - I, 0) | Menu guard = min(average daily demand, peak daily demand); batch/mixed guard = peak daily demand based on direct dependency links |
| intermittent_low_turn | Target = first positive demand row + sparse guard; raw order = max(target - I, 0) | For repeated positive rows, guard is min(average demand, a peak/first-event difference or average demand) |

**Only stable-stock quantity math uses z/service level.** Other policies return configured service-level metadata but do not calibrate their quantities to that probability. ABC classifications remain metadata; the old B x1.1 and C x1.5 quantity multipliers are gone.

The shared final cap is:

```
max_target_stock = capped lead demand + capped tail demand + safety_stock
max_order_cap = max(max_target_stock - I, 0)
effective_cap = min(max_order_cap, max_stock_level - current_usable_stock)
```

No max stock setting means unlimited capacity. For non-fresh policies MOQ can raise the proposed quantity, then the cap trims it; fresh keeps its safe quantity and flags incompatible MOQ. Only stable returns nonzero safety_stock, so fresh/recipe/sparse reserves can be trimmed by a common cap that omits their policy buffer. A returned target and the final buy quantity therefore need not match.

Example stable policy, before supplier pack rounding: lead demand 20 kg, protection demand 60 kg, sigma 3 kg/day, z 1.645, L=2. Safety stock is about 6.98 kg; trigger is 26.98 kg and target is 66.98 kg. With I=15 kg and no capacity restriction, order 51.98 kg. With 10 kg packs that becomes 60 kg. Existing confirmed inbound is currently ignored. This example illustrates the implemented math, not a recommended restaurant setting.

## Confirmed defects and missing connections

- Recipe expansion ignores g/kg and ml/liter conversions. Reproduced 100 g -> 100 kg and 250 ml -> 250 liters.
- Daily usage groups timestamps, does not distinguish movement types, and omits zero days. Fourteen same-date one-unit rows return mean 1 and standard deviation 0. Sales-derived history also retains timestamps.
- Lot and aggregate stock diverge. Reproduced summary 20 kg/lot 100 kg -> 100 kg usable. Expired-only lots can fall back to positive summary stock. Prepared-batch spoilage is skipped.
- Fresh demand windows start on decision date rather than new delivery date. Two-day lead/shelf life with 20 units of demand on/after delivery returns no order.
- Same-date source rows are separate events. Reproduced 4+6 same-date demand -> next event 4, final buy 6, event spacing zero days.
- Incoming confirmed purchase quantities are unavailable to the decision.
- PO quantities already expanded from packs are expanded again on receipt: two 10 kg packs -> 20 kg PO -> 200 kg receipt with a 5x2 kg mapping.
- Prep execution uses removed ingredient_id, has no nested input branch, repeats output on repeated completion, and does not persist actual output quantity.
- Net prep production and raw-input purchasing are not connected; the batch guard is a peak-day heuristic rather than a real batch requirement.
- Force EOD resets the sales flag without durable per-movement protection. Deduction failures still mark sales complete. Run flags do not provide atomic ownership.
- Forecast date is not propagated into history/future date construction. Recovery may mix later forecast IDs/current recipes; fractional fresh quantities differ from integer persisted recovery. Derived outputs are not persisted by the advanced engine for all cached consumers.
- GBM training and inference feature sets differ; future actuals filled with zero enter latest-forecast metrics. Historical error features require availability/leakage review.

The every_n_days schedule also lacks a persistent anchor; recalculating today+N postpones the next order. EOD selection and persisted PO dates do not consistently use the resolved cadence/run date. These need regression tests alongside arrival-window fixes.

## History

- `e4aebf2` (August 2, 2025): simple reorder point/order target plus ABC multipliers; advanced EOD branch was incomplete and prep scheduling was a reminder comment.
- `ab13bb8` (November 24, 2025): forecast run ledger.
- `6bd1cfb` (December 25, 2025): typed/nested batch model; old production loop remained.
- `8117fcf` (April 13, 2026): recursive recipe/batch forecasting and sales expansion.
- `7eb45a0`, `5bcffdf`, `1bfe068`, `4955e85` (April 17, 2026): cadence, four policies, shared caps and MOQ review.
- `512c970`, `0cc4214` (April 20, 2026): lot projection/expiry explanations.

## Algorithm experiment to discuss

Recommendation to evaluate, not an implementation decision: retain the current policy as a comparison and try an expiry-aware periodic order-up-to policy, then a bounded candidate search over feasible pack quantities.

1. At an actual supplier review date, forecast through the next replenishment opportunity. Use a service-appropriate uncertainty distribution over that horizon.
2. Simulate existing lot ages, input/output prep requirements, confirmed arrivals, consumption and expiry. Flag shortages before arrival separately.
3. Evaluate zero or feasible integer pack orders, with MOQ, storage and shelf-life constraints. Include alternative supplier options where practical.
4. Compare expected waste cost and shortage impact at agreed availability levels. Disclose uncertain inputs and infeasible constraints.
5. Backtest with only data available at each origin. Measure waste mass/cost, fill rate, unmet demand, stockout days, average inventory/cash and operational feasibility. Do not claim an improvement from lower forecast MAPE alone.

Start with a corrected deterministic seasonal baseline, then empirical horizon errors/scenarios where sufficient data exists. Restaurant-specific simulation is necessary; retail literature does not establish performance here. Sales during stockouts are censored demand, and missing POS data/closed days require explicit handling.

Sources: [MIT inventory model summary](https://ocw.mit.edu/courses/15-763j-manufacturing-system-and-supply-chain-design-spring-2005/e1800430fdccaf618b22bd551fc00fac_summary.pdf) distinguishes periodic/continuous review and the lead-plus-review protection period. [Pauls-Worm et al. (2023)](https://research.wur.nl/en/publications/on-order-policies-with-pre-specified-order-schedules-for-a-perish/) studies practical waste/service tradeoffs under fixed perishable delivery schedules. [Hyndman and Athanasopoulos](https://otexts.com/fpp3/tscv.html) explains rolling-origin multi-step forecast evaluation.

## Validation

Full collection using `--import-mode=importlib`: 275 tests collected but three modules fail collection (EOD unit NameError, reorder unit IndentationError, sales forecast unit IndentationError). Selected adjacent pipeline/inventory/forecast suites: 188 passed, 6 failed, 10 skipped. Several failures are stale mocks/date assumptions or mismatched policy expectations; they are not all evidence of production bugs. Additional targeted reproductions above used current ORM/mocked repositories. No live database or restaurant operations were changed.

Issue links and execution order follow below.

## GitHub execution backlog

Tracking issue: https://github.com/tvanceparker/prepiq/issues/57

### 1. Restore validation and establish quantity integrity

- [[P1] Restore executable pipeline tests and add representative waste-focused regressions](https://github.com/tvanceparker/prepiq/issues/55)
- [[P0] Normalize recipe, forecast, and inventory quantities before arithmetic](https://github.com/tvanceparker/prepiq/issues/43)
- [[P0] Unify pack, MOQ, PO, and receipt quantity contracts and enforce final constraints](https://github.com/tvanceparker/prepiq/issues/49)
- [[P0] Reconcile lot balances with stock and include prepared-batch expiry](https://github.com/tvanceparker/prepiq/issues/45)
- [[P0] Repair batch production and make completion atomic and idempotent](https://github.com/tvanceparker/prepiq/issues/50)
- [[P0] Make EOD retries, concurrency, and partial failures safe for inventory](https://github.com/tvanceparker/prepiq/issues/52)

### 2. Make forecasts and purchasing temporally consistent

- [[P1] Build daily usage statistics from business-date totals and explicit movement types](https://github.com/tvanceparker/prepiq/issues/44)
- [[P1] Consolidate daily ingredient demand before reorder event and peak calculations](https://github.com/tvanceparker/prepiq/issues/48)
- [[P1] Anchor and persist reproducible forecast runs across live and historical recovery](https://github.com/tvanceparker/prepiq/issues/53)
- [[P1] Align forecast training/inference features and evaluate only observable outcomes](https://github.com/tvanceparker/prepiq/issues/54)
- [[P1] Separate pre-delivery shortages from post-delivery shelf-life demand](https://github.com/tvanceparker/prepiq/issues/46)
- [[P1] Include confirmed undelivered purchase quantities in inventory position](https://github.com/tvanceparker/prepiq/issues/47)

### 3. Finish net production planning and measure waste improvements

- [[P1] Connect forecast batch demand to net production and purchasing plans](https://github.com/tvanceparker/prepiq/issues/51)
- [[P2] Benchmark expiry-aware replenishment algorithms against waste and availability](https://github.com/tvanceparker/prepiq/issues/56)

