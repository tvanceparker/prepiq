# Auth Modernization v1 - Testing Checklist

This document provides a step-by-step testing guide for the auth system modernization.

## Prerequisites
- Backend running: `uvicorn main:app --reload` at http://localhost:8000
- Frontend running: `npm start` at http://localhost:3000  
- Mobile running: `npm start` (if testing mobile)
- Database migrations applied (001 & 002)

## Database Setup

Before testing, apply the migrations:

```bash
# Apply device management fields
mysql -u root -p prepiq < scripts/migrations/001_add_device_management_fields.sql

# Apply MFA prep fields  
mysql -u root -p prepiq < scripts/migrations/002_add_mfa_prep_fields.sql
```

Verify migrations:
```bash
mysql -u root -p prepiq -e "DESCRIBE devices;" | grep -E "is_active|last_seen_at|biometric|fingerprint"
mysql -u root -p prepiq -e "DESCRIBE employees;" | grep -E "mfa_enabled|mfa_method"
```

## 1. Backend Endpoint Tests

### 1.1 Login Endpoint
**Test**: POST `/api/v1/auth/login`
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=password" \
  -i
```

**Expected Response**:
- Status: 200 OK
- Body includes: `access_token`, `refresh_token` (in Set-Cookie), `restaurant_id`, `subscription_tier`, `expires_in`, `role_id`
- Cookie: `refresh_token` with `HttpOnly`, `SameSite=Lax`

**Verify**:
- [ ] Access token is a valid JWT
- [ ] `expires_in` is > 2,000,000 (dev mode, ~30 days)
- [ ] Refresh token cookie is set
- [ ] User data matches login request

### 1.2 Refresh Token Endpoint
**Test**: POST `/api/v1/auth/refresh`
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b "refresh_token=<your_refresh_token_from_login>" \
  -i
```

**Expected Response**:
- Status: 200 OK
- Body includes: `access_token`, `token_type`, `expires_in`
- New token is different from old token

**Verify**:
- [ ] New access token is generated
- [ ] Token is valid (can decode JWT)
- [ ] `expires_in` field is present

### 1.3 GET /auth/me Endpoint
**Test**: GET `/api/v1/auth/me`
```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>" \
  -i
```

**Expected Response**:
- Status: 200 OK
- Body includes:
  ```json
  {
    "user": {
      "user_id": <id>,
      "username": "admin",
      "name": "Admin User",
      "restaurant_id": 1,
      "role_id": <role>,
      "subscription_tier": "basic|pro|master"
    },
    "permissions": ["perm1", "perm2", ...]
  }
  ```

**Verify**:
- [ ] User info matches logged-in user
- [ ] Permissions list is not empty (or empty if user has no permissions)
- [ ] Response is valid JSON

### 1.4 Logout Endpoint
**Test**: POST `/api/v1/auth/logout`
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -i
```

**Expected Response**:
- Status: 200 OK
- Body: `{"message": "Successfully logged out...", "timestamp": "..."}`
- Cookie: `refresh_token` is deleted

**Verify**:
- [ ] Logout returns 200
- [ ] Refresh token cookie is cleared
- [ ] Activity log shows logout event
- [ ] Old token still works (no revocation in v1)

## 2. Frontend Web Tests

### 2.1 Login Flow
1. Navigate to http://localhost:3000/login
2. Enter username (e.g., "admin") and password
3. Click "Login"

**Verify**:
- [ ] Form validates on submit
- [ ] Loading spinner shows
- [ ] On success, redirected to dashboard
- [ ] AuthContext has `user`, `token`, `tier` set
- [ ] localStorage contains `token` and `user` keys
- [ ] Permissions loaded (check Network tab)

### 2.2 Session Persistence
1. Login successfully
2. Refresh page (Cmd+R / Ctrl+R)

**Verify**:
- [ ] User remains logged in
- [ ] Dashboard loads without re-login
- [ ] User info restored from localStorage
- [ ] No 401 errors in console

### 2.3 Silent Token Refresh
1. Login successfully
2. Wait 5 seconds
3. Click any button that makes an API request

**Verify**:
- [ ] authFetch detects 401 (if token expired)
- [ ] Refresh endpoint called automatically
- [ ] Request retried with new token
- [ ] No user interruption

### 2.4 Logout Flow
1. Login successfully
2. Click "Logout" button

**Verify**:
- [ ] User redirected to login page
- [ ] localStorage cleared (token, user, etc.)
- [ ] AuthContext cleared
- [ ] Cannot access protected routes

### 2.5 Multiple Tab Logout
1. Open two browser tabs, both logged in
2. Logout in Tab 1
3. Click any button in Tab 2

**Verify**:
- [ ] Tab 2 detects 401 on next request
- [ ] Tab 2 redirects to login automatically

## 3. Mobile Tests (React Native)

### 3.1 Login on Mobile
1. Start mobile app
2. Navigate to login screen
3. Enter credentials and press Login

**Verify**:
- [ ] Token stored in AsyncStorage
- [ ] User info persists across app restarts
- [ ] Dashboard loads after login

### 3.2 Session Restoration
1. Login on mobile
2. Kill app (force close)
3. Reopen app

**Verify**:
- [ ] App restores session from AsyncStorage
- [ ] No re-login required
- [ ] Permissions fetched from `/auth/me`

### 3.3 Mobile Logout
1. Login and navigate
2. Tap "Logout" option

**Verify**:
- [ ] AsyncStorage cleared completely
- [ ] Navigated to login screen
- [ ] Can login again

## 4. Error Scenarios

### 4.1 Invalid Credentials
**Test**: POST `/api/v1/auth/login` with wrong password
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=wrongpassword"
```

**Expected**: 
- [ ] Status 401 Unauthorized
- [ ] Error message about invalid credentials
- [ ] No token in response

### 4.2 Missing Token
**Test**: GET `/api/v1/auth/me` without Authorization header
```bash
curl http://localhost:8000/api/v1/auth/me
```

**Expected**:
- [ ] Status 401 Unauthorized
- [ ] Error message about missing credentials

### 4.3 Expired Token
**Test**: (Requires setting tokens to expire immediately for testing)
1. Wait for token to expire
2. Make request to `/api/v1/auth/me`

**Expected**:
- [ ] Get 401
- [ ] Frontend retries with refresh token
- [ ] Either succeeds or redirects to login

### 4.4 Invalid Refresh Token
**Test**: POST `/api/v1/auth/refresh` with invalid cookie
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -b "refresh_token=invalid.jwt.token"
```

**Expected**:
- [ ] Status 401 Unauthorized  
- [ ] Error about invalid refresh token

## 5. Database Verification

### 5.1 Check Activity Logging
```sql
SELECT * FROM activity_logs 
WHERE action = 'User Login' OR action = 'User Logout'
ORDER BY created_at DESC
LIMIT 10;
```

**Verify**:
- [ ] Login events recorded with timestamp
- [ ] Logout events recorded
- [ ] Correct restaurant_id and employee_id

### 5.2 Check Device Table Updates
```sql
SELECT device_id, name, device_type, is_active, last_seen_at, biometric_capability, fingerprint_hash
FROM devices
LIMIT 5;
```

**Verify**:
- [ ] New columns exist
- [ ] `is_active` defaults to 1 (true)
- [ ] `last_seen_at` is NULL or has value
- [ ] `biometric_capability` defaults to 'none'

### 5.3 Check Employees Table Updates
```sql
SELECT employee_id, name, mfa_enabled, mfa_method
FROM employees
LIMIT 5;
```

**Verify**:
- [ ] New columns exist
- [ ] `mfa_enabled` defaults to 0 (false)
- [ ] `mfa_method` is NULL

## 6. Performance Tests

### 6.1 /auth/me Response Time
```bash
time curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <token>"
```

**Expected**: < 200ms

### 6.2 Permission Loading
1. Login on web frontend
2. Open Network tab, filter to `/auth/me`
3. Check response time

**Expected**: < 500ms end-to-end

## 7. Security Spot Checks

### 7.1 JWT Claims
Login and inspect token at [jwt.io](https://jwt.io):

```bash
# Extract token from login response
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=admin&password=password" \
  -s | jq .access_token
```

**Verify in JWT decoder**:
- [ ] Claims include: `sub`, `restaurant_id`, `employee_id`, `role_id`, `exp`, `jti`
- [ ] `exp` is reasonable (future date)
- [ ] `jti` is a UUID
- [ ] No sensitive data in payload

### 7.2 Refresh Token Cookie
1. Login via curl or browser
2. Inspect cookies in browser DevTools

**Verify**:
- [ ] `refresh_token` cookie exists
- [ ] Cookie has `HttpOnly` flag (not accessible from JS)
- [ ] Cookie has `SameSite=Lax`
- [ ] Secure flag set if HTTPS (Dev: False is OK locally)

### 7.3 Password Hashing
```bash
# Check that passwords are hashed, not stored plaintext
mysql -u root -p prepiq -e \
  "SELECT employee_id, username, password_hash FROM employees LIMIT 1;"
```

**Verify**:
- [ ] `password_hash` starts with `$argon2` (Argon2 hash)
- [ ] Not the plaintext password

## Test Results Summary

Use this table to track test results:

| Test | Result | Notes |
|------|--------|-------|
| /auth/login endpoint | ✓/✗ | |
| /auth/refresh endpoint | ✓/✗ | |
| /auth/me endpoint | ✓/✗ | |
| /auth/logout endpoint | ✓/✗ | |
| Frontend login | ✓/✗ | |
| Session persistence | ✓/✗ | |
| Silent refresh | ✓/✗ | |
| Frontend logout | ✓/✗ | |
| Mobile login | ✓/✗ | |
| Mobile logout | ✓/✗ | |
| Error handling | ✓/✗ | |
| Database migrations | ✓/✗ | |
| JWT claims | ✓/✗ | |
| Cookie security | ✓/✗ | |

## Known Issues / Next Steps

- [ ] (v2) Implement token blacklist for true logout revocation
- [ ] (v2) Add rate limiting on login endpoint
- [ ] (v2) Implement MFA support
- [ ] (v2) Add device registration flow
- [ ] (v2) Add session management dashboard
