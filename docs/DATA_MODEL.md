# Data Model

## Purpose

This document summarizes the main backend data model domains and the tenant-scoping rules that shape application behavior.

It is not a full schema dump. It is a working map for developers, integrations, and future assistant retrieval design.

## Tenant Anchor

The root tenant record is the restaurant.

`restaurants` is the central configuration and tenancy table. It currently holds:

- restaurant identity and address fields
- subscription tier and subscription status
- forecast and operating settings
- timezone and hours of operation
- sales channel configuration
- EOD state such as `last_eod_run_date`
- generic JSON settings
- legacy internal POS mode flags
- external POS connection state and sync metadata
- assistant enablement and encrypted assistant API-key fields

Most operational tables are tenant-bound through `restaurant_id`.

## Major Entity Groups

### Restaurant Configuration

Primary entity:

- `Restaurant`

Important attributes:

- `subscription_tier`
- `hours_of_operation`
- `timezone`
- `settings`
- `last_eod_run_date`
- external POS fields such as `pos_provider`, `pos_connected`, `pos_last_sync`
- POS mode state such as `pos_mode`

### Menu And Recipe System

Primary entities:

- `MenuItem`
- `Recipe`
- `RecipeIngredient`
- `MenuItemRecipe`
- `RecipeModifier`
- `BatchRecipe`
- `BatchRecipeIngredient`
- `MenuItemBatchUsage`

Purpose:

- map menu items to recipes
- map recipes to ingredient usage
- support batch-prep and recipe-component workflows
- support forecast breakdowns from menu items to ingredient demand

### Ingredient, Supplier, And Inventory System

Primary entities:

- `Ingredient`
- `Inventory`
- `InventoryLot`
- `InventoryUsageLog`
- `Supplier`
- `IngredientSupplier`
- `SupplierPreference`
- `LeadTimeData`

Purpose:

- store on-hand inventory state
- track lot-level stock and expiry-sensitive flows
- record inventory deductions and adjustments
- capture supplier relationships, lead times, and purchasing preferences

### Purchasing

Primary entities:

- `PurchaseOrder`
- `PurchaseOrderItem`
- `EODPurchaseOrderSuggestion`
- `IngredientForecastBreakdown`

Purpose:

- generate forecast-based PO suggestions
- track review context and source metadata
- persist supplier-grouped orders and lifecycle status

### Sales And Forecasting

Primary entities:

- `Sales`
- `Forecast`
- `ForecastAccuracy`
- `DailyForecastAccuracy`
- `ForecastBreakdown`
- `ForecastRunLedger`
- `BatchRecipeForecastBreakdown`
- `IngredientForecastBreakdown`

Purpose:

- store sales history
- persist forecast outputs and confidence data
- measure model accuracy over time
- record forecasting pipeline state and idempotent execution progress
- expand menu forecasts into batch and ingredient demand

### Operations And Alerts

Primary entities:

- `Alert`
- `ActivityLog`
- `ErrorLog`
- `SpoilageData`
- `PrepSchedule`

Purpose:

- surface diagnostics and operator-facing issues
- retain audit trails and activity history
- support spoilage and prep workflows

### Team And Scheduling

Primary entities:

- `Employee`
- `ScheduledShift`
- `ClockEvent`

Purpose:

- maintain team roster
- store scheduled shifts and edits
- track actual clock events and insights

Current status:

- team/timekeeping is not a current product area
- schema and services exist, but `team_routes.py` is not mounted in `main.py`
- current web/mobile navigation does not expose team pages

### Orders, Payments, And Devices

Primary entities:

- `Order`
- `OrderItem`
- `OrderItemModifier`
- `Payment`
- `Device`
- `POSItemMapping`
- `POSMerchantMapping`

Purpose:

- support order and payment records
- capture payments and device registration
- map external POS items into PrepIQ entities

Current status:

- `/orders` is a mounted backend API surface, but no current sidebar order-entry page was found
- internal POS is not being used right now
- broad internal POS terminal/cash-drawer surfaces should be treated as legacy

### Supporting Operational Data

Primary entities:

- `WeatherData`
- `TrafficData`

Purpose:

- support forecasting features and contextual analytics

## Tenant Scoping Rules

Tenant-bound data should follow these rules:

- repositories receive `restaurant_id` at construction time
- standard reads and writes should be scoped through tenant-aware repositories
- service logic should not fetch data across tenants unless the feature explicitly requires cross-tenant background work
- cross-tenant orchestration such as EOD scheduling must isolate processing per restaurant

## Current Tier Representation

PrepIQ v1 should be documented with two product-facing tiers:

- `basic`
- `full`

Current client navigation and route gating already use this model directly.

Some backend persistence and older code still contain legacy tier values, but those should be treated as implementation leftovers rather than the active product contract.

For current documentation and assistant design, use `basic` and `full` as the canonical tier vocabulary.

Migration status: backend storage, seeds, JWT tier values, and service guards are being aligned to `basic/full`. Runtime code normalizes deprecated `pro/master` values to `full`, and migration `0018_migrate_subscription_tier_to_full.sql` converts stored restaurant tiers. Client auth contexts normalize legacy non-basic tiers to `full`.

## Data Model Notes For Assistant Design

The current assistant should not treat raw source code or arbitrary table dumps as the primary knowledge source.

Instead:

- live operational answers should come from structured retrieval over tenant-scoped services and repositories
- procedural or onboarding answers should come from curated documents
- blended questions should combine both with timestamps and caveats
