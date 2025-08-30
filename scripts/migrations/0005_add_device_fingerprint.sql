-- Migration 0005: Add device fingerprint for security
ALTER TABLE devices
ADD COLUMN device_fingerprint VARCHAR(255) NULL AFTER device_settings;
