# Feature Tiers

## Purpose

PrepIQ currently exposes tier information differently in backend persistence and client navigation. This document records the current state so future work stays explicit instead of assuming a single tier vocabulary.

## Backend Tier Values

The `restaurants` table currently stores subscription tier as:

- `basic`
- `pro`
- `master`

This is the backend source-of-record representation.

## Client Tier Model

The current client experience often normalizes access into two buckets:

- `basic`
- `full`

This is visible in route gating and mobile navigation. For example:

- web uses `TierGatedRoute` with `requiredTiers=['full']` for some routes
- mobile sidebar navigation uses `basic` and `full`

## Practical Interpretation

Current practical product behavior is:

- `basic` remains a limited experience
- `pro` and `master` often collapse into broader full-access client experiences

This means backend and client code do not currently describe tiering in exactly the same terms.

## Areas Affected By Tiering

Tier differences affect at least:

- route visibility in web
- navigation structure in mobile
- advanced inventory and analytics pages
- prep, supplier, and stock movement functionality
- forecast and purchasing workflows
- future assistant and MCP action exposure

## Documentation Rule

When writing or updating docs:

- use backend values when discussing persistence or JWT data
- use client values when discussing UI gating and navigation
- explicitly explain any translation between the two

## Recommendation For Future Cleanup

The system should eventually standardize one of these approaches:

- preserve `basic`, `pro`, `master` end to end
- or explicitly document a stable mapping from backend tiers to UI tiers

Until then, any new feature should state both:

- the backend tier model it depends on
- the UI tier bucket in which it is exposed

## Assistant And MCP Considerations

Future assistant capabilities should be tier-aware.

Recommended pattern:

- read-only assistant Q&A may be broadly available
- advanced analytics explanations should reflect tier availability
- future write-capable MCP tools should be filtered both by tier and by role/permission context
