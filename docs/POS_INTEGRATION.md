# POS Integration Setup Guide

## Overview

PrepIQ now supports integration with external POS systems (Square, Toast, Clover) to automatically ingest order and sales data for analytics and forecasting.

## Phase 1: Square Integration (IMPLEMENTED)

### Architecture

```
External POS (Square) → OAuth → PrepIQ → Data Ingestion → Analytics/Forecasting
                           ↓
                      Webhooks → Real-time sync
```

### Components Created

1. **Base Provider Interface** (`app/integrations/pos/base_provider.py`)

   - Abstract class defining OAuth, data fetching, webhook verification
   - All providers (Square, Toast, Clover) implement this interface

2. **Square Provider** (`app/integrations/pos/square_provider.py`)

   - OAuth 2.0 flow implementation
   - Order/payment/menu fetching via Square API
   - Webhook signature verification (HMAC-SHA256)
   - Data transformation to PrepIQ schema

3. **POS Integration Service** (`app/services/pos_integration_service.py`)

   - Orchestrates provider connections
   - Token encryption/decryption
   - Order sync (batch & real-time)
   - Webhook event processing

4. **Internal POS Service** (`app/services/internal_pos_service.py`)

   - Renamed from `pos_service.py`
   - Fallback for restaurants without external POS
   - Stripe payment processing
   - Kitchen dispatch

5. **Routes**

   - **Settings Routes** (`/api/v1/settings/pos/*`)

     - GET `/oauth-url` - Generate OAuth authorization URL
     - POST `/oauth-callback` - Complete OAuth flow
     - POST `/disconnect` - Disconnect provider
     - GET `/sync-status` - Get sync status
     - POST `/sync-now` - Manual sync trigger

   - **Webhook Routes** (`/api/v1/webhooks/pos/*`)
     - POST `/square` - Receive Square webhooks
     - POST `/toast` - Toast webhooks (Phase 2)
     - POST `/clover` - Clover webhooks (Phase 3)

### Database Schema

Added to `restaurants` table:

```sql
pos_provider ENUM('none', 'square', 'toast', 'clover') DEFAULT 'none'
pos_connected BOOLEAN DEFAULT FALSE
pos_access_token TEXT  -- Encrypted
pos_refresh_token TEXT  -- Encrypted
pos_location_id VARCHAR(255)
pos_merchant_id VARCHAR(255)
pos_last_sync DATETIME
pos_sync_enabled BOOLEAN DEFAULT TRUE
pos_webhook_secret VARCHAR(255)
pos_sync_orders BOOLEAN DEFAULT TRUE
pos_sync_payments BOOLEAN DEFAULT TRUE
pos_sync_menu BOOLEAN DEFAULT FALSE
```

### Setup Instructions

#### 1. Environment Variables

Add to `.env`:

```bash
# Encryption key for OAuth tokens (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=your_fernet_key_here

# Square API credentials (get from https://developer.squareup.com/apps)
SQUARE_CLIENT_ID=your_square_app_id
SQUARE_CLIENT_SECRET=your_square_secret
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# Use sandbox for testing
SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

#### 2. Install Dependencies

```bash
pip install cryptography httpx
```

Or add to `requirements.txt`:

```
cryptography>=41.0.0
httpx>=0.25.0
```

#### 3. Run Database Migration

```bash
mysql -u root -p prep_iq3 < scripts/migrations/add_pos_integration_fields.sql
```

#### 4. Square Developer Setup

1. Create Square Developer Account: https://developer.squareup.com/
2. Create a new application
3. Configure OAuth redirect URI: `https://your-domain.com/api/v1/settings/pos/oauth-callback?provider=square`
4. Enable required permissions:
   - `ORDERS_READ`
   - `PAYMENTS_READ`
   - `ITEMS_READ`
   - `MERCHANT_PROFILE_READ`
5. Copy Application ID → `SQUARE_CLIENT_ID`
6. Copy Application Secret → `SQUARE_CLIENT_SECRET`
7. Configure webhooks:
   - Webhook URL: `https://your-domain.com/api/v1/webhooks/pos/square`
   - Events: `order.created`, `order.updated`, `payment.created`
   - Copy Signature Key → `SQUARE_WEBHOOK_SIGNATURE_KEY`

### Usage Flow

#### Connect POS Provider (Frontend)

1. User navigates to Settings → POS Integration
2. Selects "Square" from provider dropdown
3. Clicks "Connect"
4. Frontend calls `GET /api/v1/settings/pos/oauth-url?provider=square&redirect_uri=...&state=...`
5. Redirect user to returned `oauth_url`
6. User grants access on Square's consent screen
7. Square redirects to `redirect_uri` with `code` parameter
8. Frontend calls `POST /api/v1/settings/pos/oauth-callback?provider=square&code=...`
9. Backend exchanges code for tokens, encrypts, stores in DB
10. Connection complete!

#### Data Sync

**Automatic (Webhooks):**

- Square fires webhook when order created → `/api/v1/webhooks/pos/square`
- Backend verifies signature, transforms order, inserts into DB
- Sales records created for analytics/forecasting

**Manual Sync:**

- User clicks "Sync Now" in settings
- Frontend calls `POST /api/v1/settings/pos/sync-now?days_back=7`
- Backend fetches last 7 days of orders from Square API
- Batch insert into DB

**Scheduled Sync (Future):**

- Add to `lifespan` in `main.py`:
  ```python
  scheduler.add_job(sync_all_pos_providers, "interval", hours=1)
  ```

### Testing

#### Sandbox Testing

1. Set `SQUARE_ENVIRONMENT=sandbox`
2. Use Square Sandbox credentials
3. Test orders: https://developer.squareup.com/docs/testing/sandbox

#### Webhook Testing

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/pos/square \
  -H "Content-Type: application/json" \
  -H "X-Square-Signature: your_signature" \
  -d '{
    "merchant_id": "test_merchant",
    "type": "order.created",
    "event_id": "test_event_123",
    "created_at": "2025-11-26T12:00:00Z",
    "data": {
      "type": "order",
      "id": "order_123",
      "object": { ... }
    }
  }'
```

### Security Considerations

1. **Token Encryption**: All OAuth tokens encrypted using Fernet (AES-128)
2. **Webhook Verification**: HMAC-SHA256 signature validation on all webhooks
3. **HTTPS Required**: OAuth redirects and webhooks must use HTTPS in production
4. **State Parameter**: CSRF protection via state token in OAuth flow
5. **Scope Minimization**: Request only necessary OAuth scopes

### Troubleshooting

**"ENCRYPTION_KEY not set" warning:**

- Generate key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- Add to `.env`

**Webhook signature verification fails:**

- Check `SQUARE_WEBHOOK_SIGNATURE_KEY` matches Square dashboard
- Ensure raw request body used for signature (not parsed JSON)

**No orders syncing:**

- Check `pos_last_sync` timestamp in `restaurants` table
- Verify `pos_sync_enabled` and `pos_sync_orders` are TRUE
- Check logs for API errors (rate limits, auth failures)

**Menu items not mapping:**

- Current implementation requires manual menu mapping (external_item_id → menu_item_id)
- Phase 2 will include auto-mapping via catalog sync

### Next Steps (Phase 2 & 3)

**Toast Integration:**

- Similar pattern to Square
- OAuth flow via Toast Central
- Webhook events for orders/checks

**Clover Integration:**

- OAuth via Clover App Market
- REST API for orders/payments
- Atomic webhooks

**Menu Sync:**

- Auto-create/update `menu_items` from POS catalog
- Map POS item IDs to PrepIQ menu_item_ids
- Handle modifiers/variations

**Multi-Location Support:**

- One restaurant_id → multiple POS locations
- Location-level sync settings
- Aggregated reporting

**Payment Reconciliation:**

- Match payments to orders
- Handle refunds/voids
- Daily till reconciliation reports

### API Reference

See full API documentation in Swagger: `http://localhost:8000/docs`

Key endpoints:

- `GET /api/v1/settings/pos/oauth-url`
- `POST /api/v1/settings/pos/oauth-callback`
- `POST /api/v1/settings/pos/disconnect`
- `GET /api/v1/settings/pos/sync-status`
- `POST /api/v1/settings/pos/sync-now`
- `POST /api/v1/webhooks/pos/square`
