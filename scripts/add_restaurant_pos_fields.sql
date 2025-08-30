-- Add new POS and UI configuration fields to restaurants table
-- Run this script against your MySQL/MariaDB database

USE prep_iq3;  -- Replace with your actual database name

-- Add settings JSON column (using LONGTEXT for MariaDB compatibility)
ALTER TABLE restaurants
ADD COLUMN settings LONGTEXT DEFAULT '{}' AFTER last_eod_run_date;

-- Drop old columns (if they exist)
ALTER TABLE restaurants DROP COLUMN IF EXISTS pos_mode;
ALTER TABLE restaurants DROP COLUMN IF EXISTS kitchen_mode;
ALTER TABLE restaurants DROP COLUMN IF EXISTS ui_layout_size;

-- Add new capability flags
ALTER TABLE restaurants
ADD COLUMN has_pos_display BOOLEAN DEFAULT FALSE AFTER settings;

ALTER TABLE restaurants
ADD COLUMN has_kitchen_display BOOLEAN DEFAULT FALSE AFTER has_pos_display;

ALTER TABLE restaurants
ADD COLUMN default_ui_layout VARCHAR(16) DEFAULT 'auto' AFTER has_kitchen_display;

-- Add device settings to devices table
ALTER TABLE devices
ADD COLUMN device_settings LONGTEXT NULL AFTER device_metadata;

-- Add ui_layout_size column
ALTER TABLE restaurants
ADD COLUMN ui_layout_size VARCHAR(16) DEFAULT 'auto' AFTER kitchen_mode;

-- Verify the changes
DESCRIBE restaurants;
