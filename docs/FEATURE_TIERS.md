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

This is visible in sidebar data, route gating, and mobile navigation. The current authoritative sources are:

- `frontend/src/components/data/sidebarData.js`
- `frontend/src/routes/AppRoutes.tsx`
- `mobile/src/navigation/sidebarData.ts`
- `mobile/src/navigation/routes.tsx`
- `frontend/src/contexts/AuthContext.tsx`
- `mobile/src/contexts/AuthContext.tsx`

Both web and mobile normalize raw non-`basic` backend tiers to the product-facing `full` tier.

## Legacy References Still In Code

Some backend persistence and older code paths still reference older tier names such as `pro` and `master`.

For v1 documentation purposes:

- treat those as legacy implementation details
- do not describe the current product as having three active tiers
- document current user-facing behavior as `basic` and `full`

Migration status: backend persistence, seeds, JWT tier handling, and service guards are moving to `basic/full`. Runtime tier handling normalizes old `pro` and `master` values to `full`, and `scripts/migrations/0018_migrate_subscription_tier_to_full.sql` migrates stored restaurant tiers. Treat `pro` and `master` as deprecated aliases for the full tier, not product tiers.

## Areas Affected By Tiering

Tier differences affect at least:

- route visibility in web
- navigation structure in mobile
- advanced inventory and analytics pages
- prep, supplier, and stock movement functionality
- forecast and purchasing workflows
- future assistant and MCP action exposure

For the current page-by-page tier map, see `feature-matrix.md`.

## Documentation Rule

When writing or updating docs:

- use `basic` and `full` as the default tier vocabulary for v1
- only mention `pro` or `master` when explicitly calling out deprecated legacy code or migration work
- keep UI gating and product behavior aligned to the two-tier model

## Implementation Note

The codebase is not fully normalized yet, but the docs should lead with the simplified v1 model rather than mirror every leftover legacy enum or comment.

Any new feature work should answer a simple question:

- is this available to `basic`?
- or is it `full` only?

## Assistant And MCP Considerations

Future assistant capabilities should be tier-aware.

Recommended pattern:

- read-only assistant Q&A may be broadly available
- advanced analytics explanations should reflect tier availability
- future write-capable MCP tools should be filtered both by tier and by role/permission context
