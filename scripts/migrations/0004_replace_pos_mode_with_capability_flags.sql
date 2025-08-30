-- Migration 0004: Replace POS mode columns with capability flags in restaurants table

-- Drop old columns from restaurants
ALTER TABLE restaurants DROP COLUMN pos_mode;
ALTER TABLE restaurants DROP COLUMN kitchen_mode;
ALTER TABLE restaurants DROP COLUMN ui_layout_size;

-- Add new capability flags to restaurants
ALTER TABLE restaurants
ADD COLUMN has_pos_display BOOLEAN DEFAULT FALSE AFTER settings;

ALTER TABLE restaurants
ADD COLUMN has_kitchen_display BOOLEAN DEFAULT FALSE AFTER has_pos_display;

ALTER TABLE restaurants
ADD COLUMN default_ui_layout VARCHAR(16) DEFAULT 'auto' AFTER has_kitchen_display;

-- Add device settings to devices table
ALTER TABLE devices
ADD COLUMN device_settings LONGTEXT NULL AFTER device_metadata;
