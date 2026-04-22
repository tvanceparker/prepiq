# Integrations

## Purpose

This document describes the current integration model in the backend, with emphasis on external POS integration. Internal POS is not being used right now. Older internal POS runtime artifacts still exist in docs/migrations and should be treated as legacy.

## Integration Categories

Current integration-related behavior includes:

- external POS provider connection and sync
- POS webhooks
- POS mode settings
- device registration support under auth
- assistant OpenAI key/configuration support
- operational support data such as weather for forecasting

## External POS Integration

The current external POS integration service is `POSIntegrationService`.

It currently supports:

- provider selection through a provider map
- OAuth URL generation
- OAuth completion and token storage
- encrypted token persistence
- sync orchestration
- merchant mapping for webhook routing
- disconnect and token revocation behavior

## Provider Model

The current provider map is:

- `square` implemented
- `toast` planned
- `clover` planned

The provider architecture is adapter-based, with provider-specific logic separated from the orchestration service.

## Square Flow

Current Square integration behavior includes:

1. generate OAuth URL
2. exchange authorization code for tokens
3. encrypt tokens before storing them on the restaurant record
4. resolve location and merchant identifiers
5. create merchant mapping for webhook routing
6. allow manual or automated sync behavior

## Webhook Model

Current webhook endpoints live under `/api/v1/webhooks/pos`.

Implemented behavior:

- Square webhook endpoint
- merchant lookup by `merchant_id`
- per-restaurant routing through merchant mappings
- webhook validation and processing through `POSIntegrationService`

Planned but not yet implemented:

- Toast webhook endpoint
- Clover webhook endpoint

## Internal POS Legacy Artifacts

Internal POS is not a current product surface.

Legacy/internal POS artifacts include references to:

- device registration and settings
- order creation and updates
- payment confirmation flows
- cash drawer operations
- terminal location and reader management
- terminal payment flows
- POS mode configuration

Current interpretation:

- external POS integration is the active integration surface
- `/orders` is a mounted backend API, but no current sidebar order-entry page was found
- device registration exists under `/auth/register-device`, not a mounted broad `/pos` route group
- cash drawer and terminal reader surfaces should be treated as legacy

## Restaurant-Level Integration Fields

The restaurant record currently stores integration-related state such as:

- `pos_provider`
- `pos_connected`
- encrypted token fields
- `pos_location_id`
- `pos_merchant_id`
- `pos_last_sync`
- sync flags for orders, payments, and menu
- `pos_mode`
- assistant settings and encrypted assistant API-key fields

Some legacy terminal and cash-drawer fields or migrations may still exist, but they are not the current active integration story.

## Security Model

Current integration security includes:

- encrypted token storage
- provider-specific credential handling
- webhook signature verification
- merchant mapping before routing webhook events to a tenant

## Documentation Rule

When documenting integrations, keep these distinctions explicit:

- external POS integration versus legacy internal POS artifacts
- OAuth setup versus ongoing sync behavior
- merchant mapping versus restaurant configuration
- current provider support versus planned provider support

## Assistant Implications

The current assistant should be able to explain:

- whether a restaurant is connected to an external POS
- when the last sync occurred
- which POS mode is currently active
- whether the issue is operational setup, webhook routing, or live POS runtime behavior

Those answers should come from structured backend state plus troubleshooting docs, not just from provider setup text.
