# Alerts And Diagnostics

## Purpose

This document describes the current alerting model, the operator-facing alert lifecycle, and the diagnostic surfaces that support operational review.

## Alerting Scope

The current alert system spans:

- alert creation and normalization in `AlertsService`
- alert lifecycle routes under `/alerts`
- discrepancy-linked alert handling for inventory deduction failures
- admin diagnostic endpoints for sales-data and EOD validation
- waste analytics insights that complement, but do not replace, the main alert system

## Alert Severity Model

The alert service normalizes severity into a constrained operator-facing set:

- `info`
- `warning`
- `urgent`

Incoming severities such as `high` and `critical` are currently normalized into `urgent`.

This means downstream UI and docs should use the normalized severity vocabulary, not arbitrary source strings.

## Alert Lifecycle

Current alert state behavior includes:

- creation with status `Active`
- acknowledgment with status `Acknowledged`
- resolution with status `Resolved`

The alert routes currently expose:

- create alert
- get all alerts
- get active alerts
- acknowledge alert
- resolve alert
- fix alert
- active alert count

## Operator Copy Model

`AlertsService` does more than pass raw alert messages through.

It currently generates normalized operator-facing fields such as:

- human-friendly title
- action label
- description/message text

This is important because alerts are already treated as a user-facing communication layer, not just a raw event log.

## Current High-Value Alert Types

The service currently has explicit operator copy for alert types including:

- `Inventory:DeductionFailed`
- `DataQuality:MissingChannel`
- `DataQuality:NullOrZeroQuantity`
- `DataQuality:QuantityOutlier`
- `LowStock`
- `MissingSalesData`
- `prep_incomplete`

Any unknown alert type falls back to a humanized title plus a generic review action.

## Inventory Discrepancy Integration

Inventory deduction failures are special because they are linked to discrepancy records.

Current behavior includes:

- acknowledgment propagating to discrepancy acknowledgement
- resolution propagating to discrepancy resolution

This means inventory shortfall alerts are not isolated notifications. They are tied to a repair workflow.

## Diagnostic Surfaces Beyond Alerts

The current operational diagnostics model also includes:

- admin activity logs
- admin sales data quality checks
- admin EOD write checks
- EOD run summaries with stage details, errors, and repair targets
- waste analytics summary and insights

These surfaces complement alerts and often provide the deeper evidence needed to explain or fix them.

## Waste Analytics As Diagnostic Context

`WasteAnalyticsService` currently computes:

- total waste quantity
- total waste cost
- average daily cost
- trend points over time
- type-based breakdowns
- top ingredients and reasons
- generated insights with severity and recommended actions

This is not the same as the alert system, but it is relevant diagnostic context for operational review and future assistant explanations.

## Admin Diagnostics

The admin route surface currently provides several diagnostic tools:

- tenant info read and update
- activity logs
- sales data quality check trigger
- end-of-day write validation
- role and permission review
- employee and role management

For troubleshooting, the highest-value admin endpoints are currently:

- `/admin/activity_logs`
- `/admin/run_sales_data_check`
- `/admin/check_end_of_day_writes`

## Documentation Rule

When documenting or extending alerts and diagnostics:

- use normalized severities
- distinguish raw event source from operator-facing copy
- distinguish alert lifecycle from discrepancy lifecycle
- separate alert notifications from deeper diagnostic evidence such as logs and summaries

## Assistant Implications

The assistant should answer alert questions using structured retrieval from:

- alert state and normalized copy
- discrepancy status when relevant
- EOD summary and forecast state for batch-process issues
- activity logs and admin diagnostics for deeper explanation
- waste analytics insights where the issue is operational waste rather than a single alert event

It should not treat a raw alert message alone as sufficient context for root-cause explanation.
