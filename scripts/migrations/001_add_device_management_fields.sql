-- Migration: Add device management fields
-- Purpose: Enable device health tracking and biometric support
-- Date: 2026-03-23
-- Target: MariaDB

-- Add new columns to devices table
ALTER TABLE devices
ADD COLUMN is_active BOOLEAN DEFAULT TRUE AFTER updated_at,
ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL AFTER is_active,
ADD COLUMN biometric_capability VARCHAR(20) DEFAULT 'none' AFTER last_seen_at;

-- Create index for device health queries
CREATE INDEX idx_devices_restaurant_active ON devices(restaurant_id, is_active);
CREATE INDEX idx_devices_restaurant_last_seen ON devices(restaurant_id, last_seen_at);

-- Rename device_fingerprint to fingerprint_hash for clarity
-- Note: This requires a CHANGE COLUMN in MariaDB
ALTER TABLE devices 
CHANGE COLUMN device_fingerprint fingerprint_hash VARCHAR(255) NULL;

-- Create index for fingerprint lookups
CREATE INDEX idx_devices_fingerprint ON devices(restaurant_id, fingerprint_hash);

-- Add comment for clarity
ALTER TABLE devices MODIFY COLUMN is_active BOOLEAN DEFAULT TRUE COMMENT 'Device is active and can be used for authentication';
ALTER TABLE devices MODIFY COLUMN last_seen_at TIMESTAMP NULL COMMENT 'Last time device made a successful request';
ALTER TABLE devices MODIFY COLUMN biometric_capability VARCHAR(20) COMMENT 'Biometric capability: none | touch_id | face_id | nfc';
ALTER TABLE devices MODIFY COLUMN fingerprint_hash VARCHAR(255) COMMENT 'SHA256 hash of device hardware fingerprint';
