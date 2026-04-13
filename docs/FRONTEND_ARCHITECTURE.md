# Frontend Architecture

## Purpose

This document describes the current web client structure and the implementation patterns used across the React application.

## Stack

The web client currently uses:

- React
- React Router
- TanStack Query
- MUI
- shared TypeScript interfaces under `frontend/src/interfaces/`

## Route Structure

The current web application is organized into these top-level route groups:

- `/dashboard`
- `/sales`
- `/menu`
- `/inventory`
- `/analytics`
- `/prep`
- `/admin`
- `/settings`

Routing is defined in `frontend/src/routes/AppRoutes.tsx` and protected through a protected-route shell plus tier-gated routes where needed.

## Layout Model

The main authenticated shell is centered around `Layout.tsx`.

Current layout responsibilities include:

- sidebar and drawer behavior
- header visibility and scroll interaction
- alert count access
- logout and navigation hooks
- theme toggling and persisted theme state

This means layout is both a UI shell and a small coordination layer for authenticated navigation.

## State And Data Fetching

The current preferred page pattern is:

- TanStack Query for remote data
- colocated hooks for data logic and mutations
- page components focused on rendering and local UI state

This is especially visible in settings flows such as `useIntegrationSettings.ts`.

## Shared Interface Layer

The web client keeps domain contracts under `frontend/src/interfaces/`.

Important current interface areas include:

- auth
- inventory
- forecast
- dashboard
- menu
- prep
- orders
- POS
- settings

These interfaces should stay aligned with backend DTO changes.

## Settings Pattern

The settings area is a strong example of the current frontend architecture.

Current settings pages include:

- restaurant settings
- integration settings
- account settings

The integration settings hook currently owns:

- query definitions
- mutations
- snackbar state
- provider connect and disconnect actions
- sync and terminal reader workflows

This is the preferred pattern for non-trivial pages.

## Tier-Aware UI Behavior

The web client uses route gating and tier-aware navigation.

Examples include:

- protected routes for authenticated access
- `TierGatedRoute` for feature exposure such as stock movements
- route groups that differ between limited and full experiences

## Documentation Rule

When adding or documenting new frontend features:

- keep API interaction in hooks where practical
- keep backend DTOs and frontend interfaces aligned
- avoid scattering fetch logic across presentation components
- preserve the current route grouping model unless the task is explicitly structural

## Assistant Implications

The future assistant's first web surface should likely live in settings or another global authenticated surface.

When added, it should follow the existing frontend pattern:

- dedicated page or panel component
- dedicated hook for query and mutation logic
- shared interfaces matching backend assistant DTOs
