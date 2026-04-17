# Replenishment Policy Engine

## Purpose

This document explains the cadence-aware replenishment direction for PrepIQ and the implementation foundation now present in the codebase.

It is the design note for moving from a mostly static reorder calculation to a restaurant-appropriate hybrid model that respects perishability, supplier cadence, and operational review cycles.

## Why Change The Old Model

The earlier reorder logic leaned on a small set of static signals:

- one global service level assumption
- ABC multipliers
- lead-time-driven reorder math
- preferred supplier fallback logic

That is workable for basic alerting, but it is not strong enough for small and mid-sized restaurants where the real constraint is often not just lead time. It is also:

- when the supplier accepts orders
- when deliveries actually arrive
- how fast a perishable item spoils
- whether the item is stable pantry stock or low-turn specialty inventory

The new direction makes cadence a first-class input instead of treating every ingredient as a simple continuous-review inventory item.

## Core Design Decision

The new model separates two concerns that were previously blended together.

### Ingredient Policy

Ingredient records now carry policy metadata that describes how the item should behave conceptually:

- `fresh_perishable`
- `stable_stocked`
- `recipe_dependent`
- `intermittent_low_turn`

These fields live on the ingredient because they describe the ingredient itself, not any single supplier relationship.

The current schema also allows:

- policy assignment mode
- target service level override
- service level z-score override
- policy override reason

### Supplier Cadence

Ingredient-supplier links now carry cadence metadata that describes when and how that supplier can actually support replenishment:

- review period days
- order schedule type
- allowed order days
- allowed delivery days
- cadence source
- cadence confidence score

These fields live on the ingredient-supplier mapping because cadence is supplier-specific.

## Why This Split Matters

This split fixes a common failure mode in restaurant replenishment systems.

An ingredient can be highly perishable regardless of supplier, while the order timing and delivery rhythm can change by supplier. If those are modeled in one place, the system becomes hard to reason about and hard to tune.

By separating them:

- policy answers what kind of replenishment behavior the ingredient needs
- cadence answers when replenishment can really happen

That gives the reorder engine cleaner inputs for later phases.

## Implemented In This Slice

The current implementation adds both the configuration layer and the first live engine integration.

### Backend Storage

The ORM and SQL migration now add:

- ingredient policy fields on `ingredients`
- cadence fields on `ingredient_supplier`

### Shared Helper

`app/utils/replenishment_policy.py` now provides:

- value normalization for policy and cadence settings
- weekday normalization for order and delivery schedules
- cadence resolution helpers that can calculate next order date, next delivery date, and protection window length

This helper is intentionally reusable by inventory services, menu services, and the later reorder engine refactor.

### Service Wiring

The current code now wires the new fields through:

- menu ingredient upsert flows
- inventory ingredient-supplier create and update flows
- supplier and ingredient serialization payloads

That means the data can round-trip through the real editing surfaces rather than living only in the database schema.

### Live Reorder Path

`ReorderForecastEngine` now uses cadence-aware protection windows when manual and EOD purchase-order suggestions are generated.

The current live path now resolves:

- supplier cadence
- next order and delivery timing
- effective lead days from the current date to the next feasible delivery
- policy-driven service levels
- coverage capping when shelf life is shorter than the cadence protection window
- usable stock from available lots, excluding inventory that expires before the replenishment window

This is now active in:

- `InventoryService.generate_purchase_order_suggestions()`
- `EODService.generate_suggested_purchase_orders()`

### Web And Mobile Editing Surfaces

Existing inventory and supplier editors now expose:

- ingredient policy fields in the ingredient catalog
- cadence fields in supplier relationship editors on web and mobile

This was done in the existing surfaces rather than creating a second settings area, so configuration stays close to the purchasing workflow it affects.

## How The New Engine Is Intended To Work

The full reorder-engine refactor is not complete in this slice, but the intended flow is:

1. Determine the ingredient policy.
2. Resolve usable stock instead of raw on-hand alone, using available lots and expiry timing.
3. Resolve supplier cadence and next feasible delivery timing.
4. Size protection demand using lead time plus cadence-aware review coverage.
5. Apply spoilage-aware caps and packaging constraints.
6. Return explanation metadata that shows both policy reasoning and cadence reasoning.

## Schedule Semantics

The current helper supports three schedule types:

- `ad_hoc`: order whenever needed
- `fixed_days_of_week`: use explicit allowed weekday windows
- `every_n_days`: use review-period cadence when exact weekdays are not fixed

For `fixed_days_of_week`, the helper can resolve:

- next order date
- next delivery date after lead time
- effective review gap between order opportunities
- a cadence-aware protection window

This is the core operational difference from the old model.

## Example

If produce is ordered on Monday, Wednesday, and Friday, but deliveries only land on Tuesday, Thursday, and Saturday, the reorder engine should not behave like the item can be replenished on any day.

Instead, it should reason about:

- how long until the next order opportunity
- how long until the next real delivery after that order
- how long the arriving stock must survive until the following review cycle

That is the production-grade behavior the new cadence layer is designed to unlock.

## Relationship To ABC

ABC still matters, but it should be an overlay rather than the primary selector for replenishment behavior.

The intended rule is:

- policy determines the replenishment pattern
- cadence determines the feasible timing
- ABC adjusts service posture and review intensity

That makes the system easier to tune and easier to explain to operators.

## Current Status

Implemented now:

- schema fields
- migration
- helper module
- API wiring
- web and mobile editing support
- cadence-aware supplier selection and protection-window sizing in the live reorder path
- aligned cadence-aware calculations in both manual preview and EOD suggestion flows
- usable-stock projection in the live reorder path so expiring lots can be excluded before comparing stock to reorder point
- unit tests for cadence normalization, supplier selection, and forecast-driven reorder decisions

Still to do:

- tune policy defaults and overlays against real restaurant behavior
- expand explanation UIs so users can see more cadence fields directly without relying only on summary text