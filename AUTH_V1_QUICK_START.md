# Auth System v1 - Quick Start Guide

## What Changed?

The authentication system has been modernized with:

- ✅ New `/auth/me` endpoint (get current user + permissions)
- ✅ Proper `/auth/logout` endpoint (logs activity)
- ✅ Token expiry information (`expires_in`)
- ✅ JWT IDs for future token revocation support
- ✅ Web & mobile now use identical patterns
- ✅ Database schema ready for device management & MFA

**No changes to user experience** - login/logout work the same way, just better behind the scenes.

---

## For Frontend Developers

### Using the Auth API

```typescript
import { login, logout, me } from '@/api/auth';

// Login
const response = await login('username', 'password');
// Returns: { access_token, restaurant_id, subscription_tier, expires_in, ... }

// Get current user + permissions
const { user, permissions } = await me();
// user = { user_id, username, name, email, restaurant_id, role_id, subscription_tier }
// permissions = ['perm1', 'perm2', ...]

// Logout (optional, AuthContext.logout() already calls this)
await logout();
```

### AuthContext Usage

No API changes - works exactly as before:

```typescript
const { user, token, tier, login, logout, permissions } = useContext(AuthContext);

// Login
await login({
  token: response.access_token,
  tier: response.subscription_tier,
  user: { username, name, ... },
  preferences: response.preferences
});

// Logout
await logout();
```

### New: Check Token Expiry

```typescript
const loginResponse = await login('user', 'pass');
const expiresInSeconds = loginResponse.expires_in;
const expiresInHours = expiresInSeconds / 3600;

// Example: Warn user before token expires
setTimeout(() => {
  showNotification(`Your session will expire in 1 hour`);
}, expiresInSeconds - 3600);
```

### Token Refresh is Automatic

No action needed - `authFetch` handles it:

```typescript
// This will automatically refresh token if 401
const response = await authFetch('/api/v1/some-endpoint');
```

---

## For Mobile Developers

### Using Mobile Auth API

```typescript
import { login, logout, me } from '@/api/auth';

// Login (same as web)
const response = await login('username', 'password');

// Get current user
const { user, permissions } = await me();

// Logout
await logout();
```

### Mobile Storage

Tokens are stored in AsyncStorage automatically:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Token automatically saved during login
const token = await AsyncStorage.getItem('token');

// Cleared automatically on logout
await AsyncStorage.removeItem('token');
```

---

## For Backend Developers

### Using Auth Service

```python
from app.services.auth_service import AuthService
from app.api.dependencies import get_auth_service, get_current_user, CurrentUser

# In a service
auth_service = AuthService(db=db)

# Create token (returns tuple now!)
token, expires_in = auth_service.create_access_token({
    "sub": "username",
    "restaurant_id": 1,
    ...
})

# Get user info + permissions
user, permissions = await auth_service.get_current_user_info(
    employee_id=123,
    restaurant_id=1,
    role_id=5
)

# Log logout
await auth_service.logout(
    employee_id=123,
    restaurant_id=1,
    username="john.doe"
)
```

### Creating Access Tokens

```python
from app.utils.security import create_access_token

# Token creation now returns (token, expires_in_seconds)
token, expires_in = create_access_token({
    "sub": "username",
    "restaurant_id": 1,
    "employee_id": 123,
    ...
})

# Include expires_in in response
response = {
    "access_token": token,
    "expires_in": expires_in,
    "token_type": "bearer"
}
```

### Protecting Routes

```python
from fastapi import Depends
from app.api.dependencies import get_current_user, CurrentUser

@router.get("/my-endpoint")
async def my_endpoint(current_user: CurrentUser = Depends(get_current_user)):
    # current_user has: username, restaurant_id, employee_id, role_id, subscription_tier
    return {"data": "..."}
```

### Getting User Permissions

```python
from app.api.dependencies import check_permissions

@router.post("/sensitive-endpoint")
async def sensitive(
    _ = Depends(check_permissions(["permission_name"]))
):
    # User has permission_name or gets 403
    return {"success": True}
```

---

## Database Migrations

Applied (required for v1):

```bash
mysql -u root -p prepiq < scripts/migrations/001_add_device_management_fields.sql
mysql -u root -p prepiq < scripts/migrations/002_add_mfa_prep_fields.sql
```

New fields added:

- `devices.is_active` - Device status
- `devices.last_seen_at` - Last auth timestamp
- `devices.biometric_capability` - Device type
- `devices.fingerprint_hash` - Device identifier (renamed from fingerprint)
- `employees.mfa_enabled` - MFA toggle
- `employees.mfa_method` - MFA type (nil | totp | sms | biometric)

---

## Common Patterns

### Pattern 1: Check if User is Admin

```python
@router.post("/admin-only")
async def admin_endpoint(
    current_user: CurrentUser = Depends(get_current_user),
    _ = Depends(check_permissions(["admin_access"]))
):
    return {"data": "admin only"}
```

### Pattern 2: Display Token Expiry in UI (Web)

```typescript
const { login } = useContext(AuthContext);

const handleLogin = async (username: string, password: string) => {
  const response = await login(username, password);

  // Show expiry info
  const expiresAt = new Date(Date.now() + response.expires_in * 1000);
  console.log(`Token expires at: ${expiresAt.toLocaleString()}`);

  // Update context
  await login({
    token: response.access_token,
    tier: response.subscription_tier,
    user: response,
    preferences: response.preferences,
  });
};
```

### Pattern 3: Refresh Token Before Expiry (Mobile)

```typescript
useEffect(() => {
  if (!token) return;

  // Proactively refresh 1 hour before expiry
  const timer = setTimeout(async () => {
    const refreshResponse = await fetch(`${API_URL}/auth/refresh`);
    if (refreshResponse.ok) {
      const { access_token } = await refreshResponse.json();
      await AsyncStorage.setItem('token', access_token);
    }
  }, expiresIn - 3600);

  return () => clearTimeout(timer);
}, [token, expiresIn]);
```

### Pattern 4: Validate Session on App Load (Web/Mobile)

```typescript
useEffect(() => {
  const validateSession = async () => {
    try {
      const { user, permissions } = await me();
      // User is valid, update context
      setUser(user);
      setPermissions(permissions);
    } catch (err) {
      // User logged out or session expired
      logout();
    }
  };

  validateSession();
}, []);
```

---

## Troubleshooting

### "Invalid credentials" on login

- [ ] Check username/password are correct
- [ ] Verify employee exists in database
- [ ] Check password was hashed with argon2

### "Unauthorized" on /auth/me

- [ ] Token might be expired, try refreshing
- [ ] Check Authorization header format: `Bearer <token>`
- [ ] Verify token wasn't revoked (if using blacklist in v2+)

### Token not refreshing automatically

- [ ] Check refresh_token cookie is set (DevTools → Application)
- [ ] Verify cookie has HttpOnly flag
- [ ] Check AuthFetch utility is being used (not plain fetch)
- [ ] Look for 401 responses in Network tab

### Can't logout

- [ ] Frontend: Check logout() button calls AuthContext.logout()
- [ ] Mobile: Check AsyncStorage is cleared after logout API call
- [ ] Backend: Check /auth/logout endpoint returns 200

### Permissions not loading

- [ ] Try `/auth/me` endpoint directly to see permissions
- [ ] Check role has permissions assigned in database
- [ ] Verify RolePermission records exist for role
- [ ] Check role_id is included in JWT claims

---

## What's Next?

### Coming in v2:

- [ ] Token revocation via blacklist
- [ ] Rate limiting on login
- [ ] MFA implementation
- [ ] Device management UI
- [ ] Session revocation dashboard

### Optional for later:

- [ ] OAuth2/SSO integration (Google, etc.)
- [ ] Biometric auth on mobile
- [ ] Passwordless login
- [ ] Geographic login anomaly detection

---

## Resources

- **Full Implementation Summary**: [AUTH_V1_IMPLEMENTATION_SUMMARY.md](./AUTH_V1_IMPLEMENTATION_SUMMARY.md)
- **Testing Guide**: [AUTH_V1_TESTING_GUIDE.md](./AUTH_V1_TESTING_GUIDE.md)
- **Migration Guide**: [scripts/migrations/README.md](./scripts/migrations/README.md)
- **Auth Service Docs**: Code comments in `app/services/auth_service.py`
- **API Docs**: FastAPI endpoints at `http://localhost:8000/docs`

---

## Questions?

Check the code comments or ask in #engineering Slack channel.
