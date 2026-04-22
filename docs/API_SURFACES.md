# API Surfaces

## Purpose

This document provides a route-level map of backend API surfaces registered in the current application. For the newer RAG-oriented map, see `backend-map.md`.

It is a practical catalog, not a generated OpenAPI replacement.

## Registration Model

Routers are mounted from `main.py` under `/api/v1`. During the current audit, no source websocket route modules were found to be registered by `main.py`.

Current mounted route modules:

- `auth_routes`
- `dashboard_routes`
- `sales_forecast_routes`
- `menu_routes`
- `inventory_routes`
- `prep_routes`
- `profit_analytic_routes`
- `waste_analytics_routes`
- `alert_routes`
- `settings_routes`
- `admin_routes`
- `orders_routes`
- `pos_webhooks`
- `pos_mappings_routes`
- `eod_routes`
- `assistant_routes`

Route files present but not mounted in `main.py`:

- `team_routes`
- `permission_routes`

Older docs or client files may refer to `kitchen_routes`, `waiter_routes`, and a broad internal `pos_routes` module. Those route source files are not active in the current backend tree and should not be documented as mounted APIs.

## Mounted Route Groups

### `/auth`

Primary capabilities:

- employee login
- refresh-token flow
- current user and whoami
- logout
- device registration under `/auth/register-device`

### `/dashboard`

Primary capabilities:

- daily overview
- quick analytics
- menu item management helpers
- sales upload flows, conflict checks, and template download
- live operations endpoint support, though the current web page is not active navigation

### `/sales_forecast`

Primary capabilities:

- upcoming forecast table, totals, and top items
- `forecast_state`
- sales breakdown and trends
- top/bottom items
- forecast accuracy chart and table
- pattern endpoints such as weekday averages and channel breakdowns
- sales explorer table/download
- sales editing and creation endpoints
- full-tier menu-mix endpoints that still use legacy pro-style endpoint names; guards use full-tier normalization

### `/menu`

Primary capabilities:

- menu items and categories
- ingredients and supplier links
- recipes and recipe usage
- batch recipe access
- recipe and menu item create/update/delete flows

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

### `/prep`

Primary capabilities:

- prep logs
- waste logs
- prep schedule CRUD
- batch recipe create, update, delete, and usage endpoints

### Analytics By Route

There is no single backend `/analytics` route prefix. Analytics is split across:

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

### `/settings`

Primary capabilities:

- restaurant settings
- account info and preferences
- change password, email, phone
- assistant enablement and encrypted API-key settings
- POS integration OAuth, status, sync, and mode flows

### `/admin`

Primary capabilities:

- tenant info
- activity logs
- sales data checks
- EOD write validation
- role and permission views
- employee management

### `/orders`

Primary capabilities:

- menu access for order entry
- list orders
- retrieve one order
- create, update, complete, cancel, and send orders
- update order status
- sales-channel lookup for order flows

This backend surface is active, but no current sidebar order-entry UI was found.

### `/webhooks/pos`

Primary capabilities:

- Square webhook handling
- Toast and Clover placeholder endpoints that return not implemented

### `/pos/mappings`

Primary capabilities:

- item mappings list, create, update, delete
- auto-match helper
- unmapped view

Current caveat: this mounted route appears to treat `CurrentUser` as a dictionary even though `get_current_user` returns a model object. Treat it as active-but-suspect until fixed.

### `/eod`

Primary capabilities:

- EOD summary
- manual finalize trigger

### `/assistant`

Primary capabilities:

- read-only assistant query endpoint
- document retrieval over `docs/` and `notes/`
- selected live structured context from existing services

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
