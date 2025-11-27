-- Migration: Add POS Integration Fields to Restaurants Table
-- Created: 2025-11-26
-- Description: Adds external POS provider integration fields for Square, Toast, Clover

-- Add POS provider enum and connection fields
ALTER TABLE restaurants
ADD COLUMN pos_provider ENUM('none', 'square', 'toast', 'clover') NOT NULL DEFAULT 'none' AFTER default_ui_layout,
ADD COLUMN pos_connected BOOLEAN DEFAULT FALSE AFTER pos_provider,
ADD COLUMN pos_access_token TEXT NULL AFTER pos_connected,
ADD COLUMN pos_refresh_token TEXT NULL AFTER pos_access_token,
ADD COLUMN pos_location_id VARCHAR(255) NULL AFTER pos_refresh_token,
ADD COLUMN pos_merchant_id VARCHAR(255) NULL AFTER pos_location_id,
ADD COLUMN pos_last_sync DATETIME NULL AFTER pos_merchant_id,
ADD COLUMN pos_sync_enabled BOOLEAN DEFAULT TRUE AFTER pos_last_sync,
ADD COLUMN pos_webhook_secret VARCHAR(255) NULL AFTER pos_sync_enabled,
ADD COLUMN pos_sync_orders BOOLEAN DEFAULT TRUE AFTER pos_webhook_secret,
ADD COLUMN pos_sync_payments BOOLEAN DEFAULT TRUE AFTER pos_sync_orders,
ADD COLUMN pos_sync_menu BOOLEAN DEFAULT FALSE AFTER pos_sync_payments;

-- Add index for faster lookups by merchant_id (for webhook routing)
CREATE INDEX idx_restaurants_pos_merchant ON restaurants(pos_merchant_id);

-- Add index for connected providers
CREATE INDEX idx_restaurants_pos_provider ON restaurants(pos_provider, pos_connected);
