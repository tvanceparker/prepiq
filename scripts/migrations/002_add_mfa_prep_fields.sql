-- Migration: Add MFA preparation fields to employees
-- Purpose: Prepare schema for future MFA support (TOTP, SMS, biometric)
-- Date: 2026-03-23
-- Target: MariaDB

-- Add MFA fields to employees table
ALTER TABLE employees
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE AFTER preferences,
ADD COLUMN mfa_method VARCHAR(20) NULL DEFAULT NULL AFTER mfa_enabled;

-- Create index for MFA queries
CREATE INDEX idx_employees_mfa_enabled ON employees(restaurant_id, mfa_enabled);

-- Add comments for clarity
ALTER TABLE employees MODIFY COLUMN mfa_enabled BOOLEAN DEFAULT FALSE COMMENT 'Whether multi-factor authentication is enabled for this employee';
ALTER TABLE employees MODIFY COLUMN mfa_method VARCHAR(20) COMMENT 'MFA method: null | totp | sms | biometric';

-- Note: When MFA is implemented, add these tables:
-- - mfa_secrets (store TOTP secrets)
-- - mfa_devices (track registered biometric/security keys)
-- - mfa_backup_codes (for account recovery)
