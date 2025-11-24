# Forecast Run Ledger Implementation Summary

## Overview

Implemented transaction safety and idempotency for the forecasting pipeline by adding a ledger-based tracking system similar to `EODRunLedger`.

## Problem Solved

The forecasting engine previously had multiple independent commits scattered throughout the pipeline:

- Line 175: `evaluate_and_record_daily_forecast_accuracy()` committed independently
- Line 266: `evaluate_and_record_accuracy()` committed independently
- Line 1031: `write_forecast_results()` committed **inside the menu item loop**

This created a risk of partial writes if the pipeline failed midway through execution.

## Solution Architecture

### 1. Database Schema (`forecast_run_ledger`)

Created a new table to track forecast pipeline execution state:

**Key Columns:**

- `id` - Primary key
- `restaurant_id`, `run_date` - Unique constraint (one run per restaurant per day)
- `running`, `lock_token` - Concurrency control
- `started_at`, `finished_at` - Execution window timestamps
- **Stage Flags** (6 boolean columns):
  - `accuracy_evaluated`
  - `daily_accuracy_evaluated`
  - `forecasts_generated`
  - `batch_breakdown_calculated`
  - `ingredient_breakdown_calculated`
  - `finalized`
- **Progress Tracking:**
  - `menu_items_processed` / `menu_items_total` - Real-time visibility
- **Performance Metrics:**
  - `durations` (JSON) - Maps stage_name → duration_ms
  - `errors` (JSON) - Array of {stage, message, timestamp}

**Files Created:**

- `app/db/models/forecast_run_ledger_orm.py` - SQLAlchemy ORM model
- `scripts/forecast_run_ledger_schema.sql` - MariaDB CREATE TABLE statement

### 2. Repository Layer

Created `ForecastRunLedgerRepository` with methods:

**Core Operations:**

- `get_or_create(run_date)` - Fetch existing or initialize new ledger
- `mark_running(ledger_id)` - Set running flag and started_at timestamp
- `finalize(ledger_id)` - Set finalized flag, finished_at, clear running flag
- `is_running(run_date)` - Check if active run exists

**Stage Management:**

- `mark_stage_complete(ledger_id, stage_name, duration_ms)` - Set stage flag + record duration
- `update_progress(ledger_id, processed, total)` - Track menu items processed
- `record_error(ledger_id, stage, message)` - Append error to JSON array

**File Created:**

- `app/repositories/forecast_run_ledger_repo.py`

### 3. Service Integration

Refactored `ForecastingEngine.run_forecasting_pipeline()`:

**Changes:**

1. **Ledger Initialization:**

   - Get or create ledger at pipeline start
   - Check if already running (via `lock_token`) → exit if locked
   - Check if already finalized → skip if complete

2. **Stage-by-Stage Execution:**

   - Each stage wrapped in `if not ledger.<stage_flag>:` check
   - Enables resumption after partial failure (idempotency)
   - Track duration for each stage
   - Call `mark_stage_complete()` after each stage
   - Use `db.flush()` to persist progress without committing

3. **Progress Tracking:**

   - Update `menu_items_processed`/`total` in the forecast generation loop
   - Provides visibility during long-running forecasts

4. **Transaction Management:**

   - Removed all independent commits from:
     - `evaluate_and_record_daily_forecast_accuracy()`
     - `evaluate_and_record_accuracy()`
     - `write_forecast_results()`
   - Single commit at end of pipeline via `finalize()`
   - Full rollback on any exception

5. **Error Handling:**
   - Try/except wraps entire pipeline
   - On error: rollback, record error in ledger, finalize, re-raise
   - Ensures ledger always reflects final state

**File Modified:**

- `app/services/forecasting_engine.py` (190+ lines changed)

### 4. Import Updates

Updated main.py to register the new ORM model with SQLAlchemy:

**File Modified:**

- `main.py` - Added `forecast_run_ledger_orm` import

## Benefits

### Transaction Safety

- **Atomicity:** All pipeline writes commit together or rollback together
- **No Partial Writes:** Eliminates risk of incomplete forecast data
- **Rollback on Failure:** Ensures database consistency

### Idempotency

- **Resume After Failure:** Skip completed stages if pipeline is rerun
- **Duplicate Prevention:** `UNIQUE(restaurant_id, run_date)` constraint
- **Concurrent Run Protection:** `running` flag + `lock_token`

### Observability

- **Progress Tracking:** Real-time visibility into menu items processed
- **Stage Durations:** Performance analysis per pipeline stage
- **Error Recording:** JSON array captures all failures with timestamps
- **Audit Trail:** `started_at`, `finished_at`, `created_at`, `updated_at`

### Operational Safety

- **Graceful Degradation:** Can resume after infrastructure failures
- **Debug Support:** Errors JSON provides troubleshooting context
- **Monitoring Ready:** Stage flags enable alerting on stuck pipelines

## Database Migration

Run the SQL schema to add the table:

```bash
mysql -u <user> -p <database> < scripts/forecast_run_ledger_schema.sql
```

Or manually execute the CREATE TABLE statement from `scripts/forecast_run_ledger_schema.sql`.

## Testing Recommendations

1. **Happy Path:** Run full pipeline, verify all stages complete and ledger finalizes
2. **Idempotency:** Rerun pipeline for same date, verify it skips (already finalized)
3. **Resumption:** Force failure mid-pipeline, rerun, verify it resumes from last completed stage
4. **Concurrency:** Attempt to run pipeline twice simultaneously, verify second run exits (lock protection)
5. **Error Recording:** Inject failures, verify errors JSON populates correctly

## Stage Execution Order

1. **Validate Sales Data** → Exit if missing
2. **Accuracy Evaluation** → `accuracy_evaluated` flag
3. **Daily Accuracy Evaluation** → `daily_accuracy_evaluated` flag
4. **Forecast Generation** (per menu item) → `forecasts_generated` flag
5. **Batch Breakdown Calculation** → `batch_breakdown_calculated` flag
6. **Ingredient Breakdown Calculation** → `ingredient_breakdown_calculated` flag
7. **Finalize** → Set `finalized` flag, commit all changes

Each stage:

- Checks flag before running (skip if already done)
- Executes work
- Records duration
- Sets completion flag
- Flushes to DB (but doesn't commit)

## Related Files

- `app/db/models/eod_run_ledger_orm.py` - Similar pattern for EOD pipeline
- `app/repositories/eod_run_ledger_repo.py` - Repository reference
- `app/services/eod_service.py` - Example of ledger usage in EOD pipeline
- `docs/EOD_MASTER_PIPELINE.md` - Documentation on EOD ledger pattern

## Performance Considerations

- **JSON Columns:** `durations` and `errors` use MariaDB JSON type (efficient storage + querying)
- **Indexes:** Added on `(restaurant_id, running)`, `run_date`, `finalized` for fast lookups
- **Flush vs Commit:** Uses `flush()` for progress updates to avoid intermediate commits
- **Lock Token:** Prevents concurrent runs from conflicting (UUID-based)

## Future Enhancements

1. Add `eod_runner`-style scheduler to automatically run forecasting pipeline daily
2. Add Grafana dashboards for stage duration metrics
3. Add alerting for pipelines stuck in `running=True` state
4. Add retry logic for transient failures (network, DB connection drops)
5. Add cleanup job to archive old ledger rows (retention policy)
