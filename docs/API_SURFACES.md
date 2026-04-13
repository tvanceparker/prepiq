# API Surfaces

## Purpose

This document provides a route-level map of the backend API surfaces currently registered in the application.

It is a practical catalog, not a generated OpenAPI replacement.

## Registration Model

Routers are mounted from `main.py` under `/api/v1`, with websocket routes registered separately.

Current route modules include:

- `admin_routes`
- `alert_routes`
- `auth_routes`
- `dashboard_routes`
- `eod_routes`
- `inventory_routes`
- `kitchen_routes`
- `menu_routes`
- `orders_routes`
- `pos_routes`
- `pos_webhooks`
- `pos_mappings_routes`
- `prep_routes`
- `profit_analytic_routes`
- `sales_forecast_routes`
- `settings_routes`
- `team_routes`
- `waste_analytics_routes`

## Core Route Groups

### `/dashboard`

Primary capabilities:

- daily overview
- live operations
- quick analytics
- menu item management helpers
- sales upload flows and template download
- pro overview data

### `/sales_forecast`

Primary capabilities:

- upcoming forecast table, totals, and top items
- `forecast_state`
- sales breakdown and trends
- top/bottom items
- forecast accuracy chart and table
- pattern endpoints such as weekday averages and channel breakdowns
- sales editing and creation endpoints

This is one of the highest-value operator data surfaces in the system.

### `/inventory`

Primary capabilities:

- inventory table and details
- stock adjustments and set-current-stock flows
- stock movement views
- lot-level information
- supplier management
- ingredient supplier management
- purchase order create, review, update, receive, and item mutation flows
- PO suggestion generation and order creation from suggestions
- discrepancy and deduction history endpoints

### `/menu`

Primary capabilities:

- menu items and categories
- ingredients and suppliers
- recipes and recipe usage
- batch recipe access
- recipe and menu item create/update/delete flows

### `/prep`

Primary capabilities:

- prep logs
- waste logs
- prep schedule CRUD
- batch recipe create, update, delete, and usage endpoints

### `/analytics` Surface By Routes

There is no single `/analytics` route prefix in the backend. Analytics is currently split across:

- `/profit_analytics`
- `/waste_analytics`
- `/sales_forecast`
- `/dashboard`

### `/profit_analytics`

Primary capabilities:

- sales-oriented profitability outputs
- ingredient cost trends
- dish profitability views

### `/waste_analytics`

Primary capabilities:

- waste summary and waste-oriented analysis outputs

### `/alerts`

Primary capabilities:

- create alert
- get all alerts
- get active alerts
- acknowledge alert
- resolve alert
- fix flow endpoint
- active count

### `/team`

Primary capabilities:

- employee CRUD-like flows
- shift creation, listing, editing, deletion
- weekly schedule and staffing views
- clock events
- staffing insights

### `/settings`

Primary capabilities:

- restaurant settings
- account info and preferences
- change password, email, phone
- POS integration OAuth and sync flows
- POS mode get/update

### `/admin`

Primary capabilities:

- tenant info
- activity logs
- sales data checks
- EOD write validation
- role and permission views

### `/pos`

Primary capabilities:

- device registration and settings
- order creation and updates
- payment intents and confirmations
- cash drawer session lifecycle and transactions
- Stripe terminal location and reader management
- terminal payment processing
- device token refresh
- POS mode settings

### `/pos/mappings`

Primary capabilities:

- item mappings list, create, update, delete
- auto-match helper
- unmapped view

### Webhook And Realtime Surfaces

Current special transport surfaces include:

- POS webhooks under `/api/v1/webhooks/pos/*`
- kitchen websocket router
- POS websocket router

## Contract Alignment

The backend contract should stay aligned with:

- `app/schemas/*_dto.py`
- `frontend/src/interfaces/`
- `mobile/src/interfaces/`

When changing backend response shapes, update corresponding client contracts in the same task unless a staged rollout is deliberate.

## Assistant Implications

For a future operator assistant, the most useful existing API-backed surfaces are:

- `/sales_forecast`
- `/inventory`
- `/menu`
- `/prep`
- `/team`
- `/alerts`
- `/settings`

These already expose the majority of structured operational questions an operator is likely to ask.
