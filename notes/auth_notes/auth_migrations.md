# Database Migrations for Auth Modernization

This note covers the SQL migration scripts for the authentication system modernization (v1).

## Migrations Overview

### 001_add_device_management_fields.sql

**Status**: REQUIRED for v1

Adds device health tracking and prepares for biometric support:

- `is_active` (boolean) - Track if device is still in use
- `last_seen_at` (timestamp) - When device last authenticated
- `biometric_capability` (varchar) - Device's biometric capabilities (none | touch_id | face_id | nfc)
- Renames `device_fingerprint` to `fingerprint_hash` for consistency
- Creates indexes for efficient device queries

**When to run**: Before deploying auth v1
**Time estimate**: < 1 minute
**Impact**: None - backward compatible, adds new optional fields

```bash
mysql -u root -p prepiq < scripts/migrations/001_add_device_management_fields.sql
```

### 002_add_mfa_prep_fields.sql

**Status**: REQUIRED for v1 (prepares for future MFA)

Adds fields to support future MFA implementation:

- `mfa_enabled` (boolean) - Toggle MFA per employee
- `mfa_method` (varchar) - MFA method type (null | totp | sms | biometric)

**When to run**: Before deploying auth v1
**Time estimate**: < 1 minute
**Impact**: None - adds optional fields, doesn't break existing logic

```bash
mysql -u root -p prepiq < scripts/migrations/002_add_mfa_prep_fields.sql
```

### 003_create_token_blacklist_optional.sql

**Status**: OPTIONAL - For v2 token revocation features

Creates table for server-side token revocation (logout with blacklist):

- `token_blacklist` table - Tracks revoked JWT tokens
- Supports immediate token invalidation on logout
- Enables token rotation strategies
- Supports future "revoke all devices" feature

**When to run**: When implementing full token revocation in v2
**Time estimate**: < 1 minute
**Optional**: Can skip for v1 (client-side logout is sufficient)

```bash
mysql -u root -p prepiq < scripts/migrations/003_create_token_blacklist_optional.sql
```

## Migration Strategy

### Development (Local)

1. Backup your local database (optional but recommended):

   ```bash
   mysqldump -u root -p prepiq > backup_prepiq_$(date +%s).sql
   ```

2. Run migrations in order:

   ```bash
   mysql -u root -p prepiq < scripts/migrations/001_add_device_management_fields.sql
   mysql -u root -p prepiq < scripts/migrations/002_add_mfa_prep_fields.sql
   # Skip 003 unless you want token blacklist
   ```

3. Verify migrations:
   ```bash
   mysql -u root -p prepiq -e "DESCRIBE devices;"
   mysql -u root -p prepiq -e "DESCRIBE employees;"
   ```

### Production (When applicable)

1. **Backup production database** (critical!)

   ```bash
   mysqldump -u root -p prepiq > backup_prepiq_prod_$(date +%s).sql
   ```

2. Run migrations during maintenance window
3. Test thoroughly before rolling code changes
4. Keep backups for 30 days

## Rollback

If you need to rollback migrations:

### Rollback 002 (MFA fields)

```sql
ALTER TABLE employees DROP COLUMN mfa_method;
ALTER TABLE employees DROP COLUMN mfa_enabled;
DROP INDEX idx_employees_mfa_enabled ON employees;
```

### Rollback 001 (Device fields)

```sql
ALTER TABLE devices DROP COLUMN biometric_capability;
ALTER TABLE devices DROP COLUMN last_seen_at;
ALTER TABLE devices DROP COLUMN is_active;
DROP INDEX idx_devices_restaurant_active ON devices;
DROP INDEX idx_devices_restaurant_last_seen ON devices;
DROP INDEX idx_devices_fingerprint ON devices;
ALTER TABLE devices CHANGE COLUMN fingerprint_hash device_fingerprint VARCHAR(255) NULL;
```

### Rollback 003 (Token Blacklist - if applied)

```sql
DROP TABLE IF EXISTS token_blacklist;
```

## Notes

- Migrations are **idempotent** (safe to run multiple times)
- All migrations preserve existing data
- No downtime required for v1 migrations (001, 002)
- Columns added with `DEFAULT` values to avoid NULL issues

## Verification Queries

Check if migrations applied successfully:

```sql
SHOW COLUMNS FROM devices WHERE Field IN ('is_active', 'last_seen_at', 'biometric_capability', 'fingerprint_hash');
SHOW COLUMNS FROM employees WHERE Field IN ('mfa_enabled', 'mfa_method');
SHOW TABLES LIKE 'token_blacklist';
```

## Future Migrations

When implementing features, add new migration files:

- `004_add_device_revocation.sql`
- `005_add_mfa_secrets_table.sql`
- `006_add_session_management.sql`

Follow the naming pattern: `NNN_description.sql`
