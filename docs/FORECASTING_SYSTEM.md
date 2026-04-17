# Forecasting System

## Purpose

This document describes the current forecasting architecture and the operator-facing forecast state model exposed by the backend.

It focuses on verified current behavior rather than older inferred pipeline narratives.

See also:

- `EOD_PIPELINE.md` for how the same forecast trust model appears inside EOD summaries
- `INVENTORY_DEDUCTION_AND_PO.md` for how forecast state affects purchase-order suggestions

## Main Components

The forecasting domain currently spans:

- `SalesForecastService`
- `ForecastingEngine`
- `ForecastingEngineBasic`
- `ForecastRunLedgerRepository`
- forecast ORM tables such as forecasts, breakdowns, and accuracy records

## Operator-Facing Forecast Surface

The main operator-facing forecast API is exposed through `/sales_forecast`.

Notable behaviors include:

- upcoming forecast table views
- top forecasted items
- accuracy views
- explicit `forecast_state`

The `forecast_state` response is important because it tells the UI whether forecast-backed output should be treated as ready, stale, degraded, or failed.

## Current Forecast State Contract

`SalesForecastService` builds forecast state around these fields:

- `forecast_source`
- `forecast_source_type`
- `forecast_generated_at`
- `forecast_reused`
- `forecast_stale`
- `forecast_status`
- `forecast_status_message`
- `forecast_confidence_score`
- `forecast_version`

Current state values include:

- `ready`
- `stale`
- `degraded`
- `failed`

Current `forecast_source_type` values used in the service layer are:

- `eod`
- `on_demand`

## How Forecast State Is Determined

Current logic checks:

1. the restaurant's `last_eod_run_date`
2. the forecast run ledger for that run date
3. whether the forecast ledger finalized
4. whether the ledger contains errors
5. whether the forecast is from a prior day and should be marked stale

In current code, `forecast_stale` is set when the effective finalized run date is older than today's cycle.

That means the present stale rule is date-based, not an hour-window threshold.

This means the current system does not treat forecast availability as a silent boolean. It exposes state and warnings explicitly.

## Forecast Metadata

The current service aggregates metadata such as:

- average confidence score across forecasts generated in a run
- latest forecast version found in the run batch

`ForecastingEngine` now also records forecast strategy metadata per menu item on the persisted `forecasts` row:

- `model_type_used`
- `model_source`
- `model_metadata`

This metadata should be preserved in client displays and future assistant responses.

## Current Model Stack

`ForecastingEngine` now makes the menu-item forecast path explicit instead of relying on one implicit fallback branch.

The current ordered stack is:

- `gbm_primary`: use the trained or loaded H2O GBM model when it is available
- `baseline`: use history-driven weekday and recent-mean blending when a usable GBM path is not available
- `intermittent`: use a sparse-demand path when the item has many zero-sales days
- `fallback`: emit zero-demand output when no usable history exists

The chosen path is explainable in two ways:

- the engine stores `model_type_used` and `model_source`
- `model_metadata` carries selection reason, metrics, and history summary

The daily forecast breakdown schema remains unchanged, so existing downstream consumers can continue using the same breakdown rows.

## Forecast Engines

### ForecastingEngine

Role:

- advanced forecasting pipeline
- explicit per-item strategy selection across GBM, baseline, intermittent, and fallback paths
- confidence scoring
- breakdown generation
- ledger-aware pipeline behavior

### ForecastingEngineBasic

Role:

- simpler forecasting path and fallback behavior

## Forecast Ledger

The forecast run ledger exists to provide:

- idempotent tracking
- stage completion visibility
- error capture
- generated item progress
- finalized state for downstream consumers

This ledger is now part of the trust model for forecast-backed screens and workflows.

## Forecasts In Purchasing

Forecasts do not only power sales pages.

`InventoryService` also uses forecast state for purchase-order suggestion generation.

That service can:

- reuse recent finalized EOD ingredient forecast breakdowns
- run a fresh forecast on demand
- degrade back to cached EOD forecast if fresh generation fails
- return source and warning metadata with the suggestions

This is one of the most important current forecast integrations in the platform.

That purchasing behavior should be read together with `INVENTORY_DEDUCTION_AND_PO.md`, because the same trust metadata is carried into PO suggestion responses.

## Current Reliability Model

Current purchasing and operator surfaces should interpret forecasts as follows:

- `ready`: use as current forecast source
- `stale`: usable with caution, but older than the current cycle
- `degraded`: finalized output exists, but warnings/errors occurred
- `failed`: no trustworthy finalized forecast is available

## Documentation Rule

Any new forecast-facing feature should:

- surface forecast freshness
- surface degraded or failed states explicitly
- avoid implying certainty when the ledger indicates problems
- keep forecast metadata aligned across backend DTOs and client interfaces

## Assistant Implications

A future assistant must not answer forecast questions as though a forecast is always valid.

It should retrieve and include:

- forecast status
- generation time
- stale state
- confidence score when available
- whether the result was reused from a prior finalized EOD run

It should also treat forecast answers, EOD answers, and purchasing answers as part of the same trust model rather than as unrelated surfaces.
