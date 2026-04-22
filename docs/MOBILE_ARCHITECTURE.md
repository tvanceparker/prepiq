# Mobile Architecture

## Purpose

This document describes the current mobile app structure and the parity expectations it has with the web client and backend.

For the reconciled mobile/web route map, see `frontend-map.md`. It records which screens are active navigation entries and which are only code-resident.

## Stack

The mobile app currently uses:

- React Native
- React Navigation
- TanStack Query
- React Native Paper
- auth and theme context providers

## App Composition

The mobile app root currently composes:

- `QueryClientProvider`
- `ThemeProvider`
- `AuthProvider`
- `PaperProvider`
- `NavigationContainer`
- `RootNavigator`

This means mobile follows the same high-level provider-first pattern as the web app, with theme and auth as first-class concerns.

## Navigation Model

Navigation lives under `mobile/src/navigation/` and uses a tier-aware sidebar-style information model.

The current mobile navigation organizes product areas into grouped sections such as:

- Dashboard
- Sales & Forecasting
- Menu & Recipes
- Inventory
- Prep Management
- Analytics
- Admin Panel
- Settings

## Tier Model

The mobile app currently uses two navigation buckets:

- `basic`
- `full`

This mirrors the practical client-access model and should stay aligned with the documented backend-to-client tier translation.

## Screen Organization

The mobile app organizes screens under `mobile/src/pages/` by domain, including:

- admin
- analytics
- auth
- dashboard
- inventory
- menu
- POS
- prep
- sales
- settings
- team

## Theme Model

The app uses theme-aware composition via React Native Paper and a custom theme context.

The app root switches both navigation theme and paper theme based on `themeName`.

## Active Versus Code-Resident Screens

Mobile source contains screens for domains such as POS and team, but active availability is controlled by `mobile/src/navigation/sidebarData.ts` and `mobile/src/navigation/routes.tsx`. Do not infer current product availability from a screen file alone.

## API And Contract Expectations

Mobile should stay aligned with backend API behavior and, where features overlap, with web interface semantics.

Important rules:

- shared backend contract changes should be reflected in mobile interfaces
- mobile should not invent divergent API shapes for shared features
- mobile may adapt UX, but should not drift from domain boundaries and workflow semantics

## Documentation Rule

When adding or documenting new mobile features:

- preserve API parity with backend contracts
- preserve tier-aware navigation behavior
- prefer theme-driven UI choices
- keep new mobile features consistent with current domain organization

## Assistant Surface

The operator assistant is now exposed as a globally reachable authenticated overlay on mobile, with settings managed from Integration Settings.

It should follow the same architectural expectations as web:

- backend-driven contract
- tenant-aware authenticated behavior
- shared semantics for source labels, stale state, and approval workflow
