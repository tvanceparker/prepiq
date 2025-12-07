# POS Integration - Quick Start Checklist

## ✅ What's Done

All core Square integration infrastructure is complete:

- [x] Database schema changes
- [x] Encryption utilities
- [x] Base provider interface
- [x] Square provider implementation
- [x] POS integration service
- [x] API routes (settings + webhooks)
- [x] Service refactoring (internal_pos_service.py)
- [x] Documentation

## 🚀 To Deploy (Required)

### 1. Install Dependencies

```bash
cd /home/user/code/prepiq
source .venv/bin/activate
pip install cryptography httpx
```

### 2. Run Database Migration

```bash
mysql -u root -p prep_iq3 < scripts/migrations/add_pos_integration_fields.sql
```

### 3. Generate Encryption Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 4. Update .env File

Add these lines to `/home/user/code/prepiq/.env`:

```bash
# Copy the key from step 3
ENCRYPTION_KEY=your_generated_key_here

# Square credentials (get from https://developer.squareup.com/apps)
SQUARE_CLIENT_ID=your_square_app_id
SQUARE_CLIENT_SECRET=your_square_app_secret
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# Use sandbox for testing
SQUARE_ENVIRONMENT=sandbox
```

### 5. Test Backend Starts

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Should see no errors. Check:

- http://localhost:8000/docs
- Look for `/api/v1/settings/pos/` endpoints
- Look for `/api/v1/webhooks/pos/square` endpoint

## 🧪 To Test (Optional)

### Test Square OAuth Flow

1. Create Square Developer account: https://developer.squareup.com/
2. Create new application
3. Set OAuth redirect URI: `http://localhost:8000/api/v1/settings/pos/oauth-callback`
4. Get OAuth URL:
   ```bash
   curl "http://localhost:8000/api/v1/settings/pos/oauth-url?provider=square&redirect_uri=http://localhost:8000/callback&state=test123" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
5. Open returned URL in browser
6. Grant access
7. Exchange code for tokens (happens automatically on redirect)

### Test Manual Sync

```bash
curl -X POST "http://localhost:8000/api/v1/settings/pos/sync-now?days_back=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Webhook (with ngrok)

1. Install ngrok: `ngrok http 8000`
2. Configure Square webhook URL: `https://your-ngrok-url.ngrok.io/api/v1/webhooks/pos/square`
3. Create test order in Square Dashboard
4. Check backend logs for webhook processing

## 📱 Frontend TODO

Need to create UI in settings page:

**Page: Settings → POS Integration**

Components needed:

- Provider selection dropdown (Square, Toast, Clover)
- "Connect" button → triggers OAuth flow
- Connection status card showing:
  - ✅ Connected to Square
  - Location: Main Street Store
  - Last sync: 2 hours ago
  - Orders synced: 1,243
- "Sync Now" button
- "Disconnect" button
- Sync settings toggles:
  - [ ] Sync orders
  - [ ] Sync payments
  - [ ] Sync menu items

## 🔧 Remaining Backend Tasks

1. **Menu Mapping**: Create logic to map external_item_id → menu_item_id

   - Option A: Manual mapping table (pos_item_mappings)
   - Option B: Auto-match by item name similarity
   - Option C: Let user select during first sync

2. **Webhook Routing**: Add merchant_id → restaurant_id lookup

   - Create table: `pos_merchant_mappings`
   - Columns: merchant_id, provider, restaurant_id
   - Populate on OAuth completion

3. **Scheduled Sync**: Add background job

   - In `main.py` lifespan, add:
     ```python
     scheduler.add_job(sync_all_pos_providers, "interval", hours=1)
     ```

4. **Unit Tests**: Test Square adapter methods
   - Mock OAuth responses
   - Mock order/payment API responses
   - Test webhook signature verification
   - Test data transformation

## 📊 How It Works

```
Restaurant uses Square POS → Customer makes order
                                     ↓
                          Square fires webhook
                                     ↓
              POST /api/v1/webhooks/pos/square
                                     ↓
                     Verify HMAC signature
                                     ↓
              Transform Square order → OrderCreate
                                     ↓
              Insert into orders + sales tables
                                     ↓
         Data available for analytics/forecasting!
```

## 🎯 Success Criteria

You'll know it's working when:

- [ ] Square OAuth completes without errors
- [ ] `restaurants` table shows `pos_connected=TRUE` and `pos_provider='square'`
- [ ] Manual sync returns `{"orders_synced": N, "status": "success"}`
- [ ] Webhook test event creates order in database
- [ ] Sales data from Square appears in PrepIQ dashboard
- [ ] Forecasting engine uses POS-sourced sales data

## 🆘 Troubleshooting

**"ENCRYPTION_KEY not set" warning:**

- Generate key and add to .env (see step 3 above)

**"Unsupported provider: square":**

- Check `SQUARE_CLIENT_ID` and `SQUARE_CLIENT_SECRET` in .env

**Webhook signature fails:**

- Verify `SQUARE_WEBHOOK_SIGNATURE_KEY` matches Square dashboard
- Check webhook is using HTTPS in production

**No orders syncing:**

- Check `pos_last_sync` in restaurants table
- Verify `pos_sync_enabled` and `pos_sync_orders` are TRUE
- Check backend logs for API errors

**Items not appearing:**

- Menu mapping not implemented yet (Phase 1 TODO)
- For now, orders default to menu_item_id=1

## 📞 Support

See full documentation: `docs/POS_INTEGRATION.md`

Questions? Issues? Check:

1. Backend logs: `logs/app.log`
2. Square API logs: Square Developer Dashboard
3. Database: Check `restaurants` table POS fields
