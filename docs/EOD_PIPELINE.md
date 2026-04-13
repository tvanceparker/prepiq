# End-Of-Day Pipeline

## Purpose

This document describes the current EOD entrypoints, summary surface, and operational status model.

It deliberately focuses on current observable behavior rather than older speculative implementation maps.

See also:

- `FORECASTING_SYSTEM.md` for the shared forecast state model used outside EOD
- `INVENTORY_DEDUCTION_AND_PO.md` for downstream purchasing behavior that consumes the same forecast trust signals

## Main Components

The EOD path currently involves:

- `EODService`
- `/eod/summary`
- `/eod/finalize`
- the scheduler in `app/utils/eod_runner.py`
- EOD and forecast ledger repositories

## Entry Paths

### Manual Trigger

`/api/v1/eod/finalize` starts EOD finalization in a background task.

Inputs include:

- `eod_date`
- `force`

The route currently returns an immediate launch summary including:

- processing state
- trigger source `manual`
- run mode `idempotent_run` or `force_rerun`
- listed protections such as idempotent sales deduction and PO write behavior

### Summary Surface

`/api/v1/eod/summary` returns the current or requested run summary.

This is the main operator-facing inspection endpoint for EOD status.

### Scheduled Trigger

`run_eod_jobs` iterates restaurants, applies timezone and hours-of-operation logic, and triggers EOD after configured close time plus grace period.

It updates `last_eod_run_date` after successful completion.

## Current EOD Summary Model

`EODService.get_eod_run_summary()` returns a structured summary that includes:

- run status and status message
- finalized and running flags
- started and finished timestamps
- stage completion list
- recorded errors
- forecast summary
- counts for usage logs, forecast progress, PO suggestions, created POs, and open discrepancies
- repair targets for unresolved inventory issues
- operator guidance

## Run Status Model

Current run-level status values are:

- `processing`
- `partial`
- `success`
- `failed`

These are determined from ledger state and recorded errors.

## Forecast Summary Inside EOD

EOD summary includes a nested forecast summary that mirrors the broader forecast trust model:

- `forecast_generated_at`
- `forecast_stale`
- `forecast_status`
- `forecast_status_message`

This keeps EOD status and sales/forecast views aligned.

The same forecast trust model also affects purchase-order suggestion behavior, so EOD status should not be interpreted in isolation from the forecasting and purchasing docs.

## Operational Guidance

One of the most useful current EOD features is generated operator guidance.

The service builds follow-up steps based on:

- whether the run is still processing
- whether the run finalized with warnings
- whether discrepancies remain open
- whether purchase-order suggestions or drafts require review
- whether forecast output is failed, degraded, or stale

This means EOD is not only a batch process. It also produces a human-facing repair and review model.

## Current Stage View

The EOD summary currently reports stages such as:

- sales deducted
- forecast completed
- reorder completed
- PO written
- finalized

This is the current stage contract that UI and future assistant diagnostics should rely on.

## Scheduler Notes

The scheduler uses:

- restaurant timezone
- parsed hours of operation
- close time plus `eod_run_after_close_mins`
- `last_eod_run_date` to avoid repeat execution for the same date

## Documentation Rule

Future EOD documentation should keep these distinctions explicit:

- launch response versus final run summary
- run-level status versus nested forecast status
- discrepancy repair targets versus general errors
- scheduler-triggered execution versus manual execution

## Assistant Implications

A future assistant diagnosing EOD issues should retrieve:

- current run status
- stage completion details
- forecast sub-status
- discrepancy counts and repair targets
- operator guidance text

This is a better source than reading raw engine code in isolation.
