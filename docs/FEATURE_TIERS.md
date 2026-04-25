# Feature Tiers

## Purpose

PrepIQ v1 uses a simplified two-tier model. This document records the current product-facing tier setup and calls out where older code still contains legacy references.

## Current V1 Tier Model

PrepIQ v1 uses:

- `basic`
- `full`

This is the tier vocabulary that current product and documentation work should use.

## Current Client Behavior

The active client experience already follows this two-tier model:

- `basic`
- `full`

This is visible in route gating and mobile navigation. For example:

- web uses `TierGatedRoute` with `requiredTiers=['full']` for some routes
- mobile sidebar navigation uses `basic` and `full`

## Legacy References Still In Code

Some backend persistence and older code paths still reference older tier names such as `pro` and `master`.

For v1 documentation purposes:

- treat those as legacy implementation details
- do not describe the current product as having three active tiers
- document current user-facing behavior as `basic` and `full`

## Areas Affected By Tiering

Tier differences affect at least:

- route visibility in web
- navigation structure in mobile
- advanced inventory and analytics pages
- prep, supplier, and stock movement functionality
- forecast and purchasing workflows

## Documentation Rule

When writing or updating docs:

- use `basic` and `full` as the default tier vocabulary for v1
- only mention `pro` or `master` when explicitly calling out legacy code or migration work
- keep UI gating and product behavior aligned to the two-tier model

## Implementation Note

The codebase is not fully normalized yet, but the docs should lead with the simplified v1 model rather than mirror every leftover legacy enum or comment.

Any new feature work should answer a simple question:

- is this available to `basic`?
- or is it `full` only?

